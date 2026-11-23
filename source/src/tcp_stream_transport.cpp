#include "tcp_stream_transport.h"

#include <cerrno>
#include <string>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <netdb.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/select.h>
#include <sys/socket.h>
#endif

namespace {

// How long connect() may wait before we give up.
constexpr int kConnectTimeoutSeconds = 5;

// How long one send() call may wait before we report a timeout.
constexpr int kSendTimeoutMilliseconds = 10 * 1000;

#ifdef _WIN32
using NativeSocket = SOCKET;

NativeSocket native(SocketHandle handle) {
    return static_cast<SOCKET>(handle);
}

SocketHandle handleFrom(NativeSocket socket) {
    return static_cast<SocketHandle>(socket);
}

bool isInterrupted(int code) {
    return code == WSAEINTR;
}

bool isWouldBlock(int code) {
    return code == WSAEWOULDBLOCK || code == WSAEINPROGRESS;
}

bool isSendTimeout(int code) {
    // A blocking Winsock send reports SO_SNDTIMEO as WSAETIMEDOUT.
    return code == WSAETIMEDOUT || code == WSAEWOULDBLOCK;
}
#else
using NativeSocket = int;

NativeSocket native(SocketHandle handle) {
    return static_cast<int>(handle);
}

SocketHandle handleFrom(NativeSocket socket) {
    return static_cast<SocketHandle>(socket);
}

bool isInterrupted(int code) {
    return code == EINTR;
}

bool isWouldBlock(int code) {
    return code == EWOULDBLOCK || code == EAGAIN || code == EINPROGRESS;
}

bool isSendTimeout(int code) {
    // A blocking POSIX send reports SO_SNDTIMEO as EAGAIN/EWOULDBLOCK.
    return code == EWOULDBLOCK || code == EAGAIN;
}
#endif

// Tell TCP to send small messages immediately instead of waiting for a full
// packet. This keeps HELLO/STREAM_START quick.
bool setTcpNoDelay(NativeSocket socket, std::string& error) {
    int yes = 1;
    if (setsockopt(socket, IPPROTO_TCP, TCP_NODELAY,
                   reinterpret_cast<const char*>(&yes), sizeof(yes)) != 0) {
        error = "cannot enable TCP_NODELAY: " + lastSocketError();
        return false;
    }
    return true;
}

} // namespace

TcpStreamTransport::~TcpStreamTransport() {
    close();
}

bool TcpStreamTransport::connectTo(const std::string& host, uint16_t port) {
    // A transport object can be reused, so always start from a clean state.
    close();
    errorText.clear();

    if (!startSocketSystem(errorText)) {
        return false;
    }

    addrinfo hints{};
    hints.ai_family = AF_UNSPEC;        // IPv4 or IPv6
    hints.ai_socktype = SOCK_STREAM;    // TCP
    hints.ai_protocol = IPPROTO_TCP;

    addrinfo* addresses = nullptr;
    const std::string portText = std::to_string(static_cast<unsigned int>(port));

    // getaddrinfo also handles host names like "localhost".
    const int lookup = getaddrinfo(host.c_str(), portText.c_str(), &hints,
                                   &addresses);
    if (lookup != 0) {
        errorText = "cannot resolve " + host + ": " + gai_strerror(lookup);
        return false;
    }

    std::string lastError = "cannot connect to " + host + ":" + portText;

    // Try every address getaddrinfo returned (for example IPv6, then IPv4).
    for (addrinfo* address = addresses; address != nullptr;
         address = address->ai_next) {
        NativeSocket candidate = socket(address->ai_family,
                                        address->ai_socktype,
                                        address->ai_protocol);
        if (candidate == native(kInvalidSocket)) {
            lastError = "cannot create socket: " + lastSocketError();
            continue;
        }

        std::string stepError;
        const SocketHandle candidateHandle = handleFrom(candidate);

        // Non-blocking connect lets us put our own time limit on it.
        if (!setSocketBlocking(candidateHandle, false, stepError)) {
            lastError = stepError;
            closeSocket(candidateHandle);
            continue;
        }

        const int result = connect(candidate, address->ai_addr,
                                   static_cast<int>(address->ai_addrlen));

        if (result != 0) {
            const int code = lastSocketErrorCode();

            if (!isWouldBlock(code)) {
                lastError = "connect failed: " + socketErrorText(code);
                closeSocket(candidateHandle);
                continue;
            }

            // The connection is in progress. Wait until the socket becomes
            // writable, or until the timeout expires.
            fd_set writeSet;
            FD_ZERO(&writeSet);
            FD_SET(candidate, &writeSet);

            timeval timeout{};
            timeout.tv_sec = kConnectTimeoutSeconds;
            timeout.tv_usec = 0;

            int selected = 0;
            do {
#ifdef _WIN32
                selected = select(0, nullptr, &writeSet, nullptr, &timeout);
#else
                selected = select(candidate + 1, nullptr, &writeSet, nullptr,
                                  &timeout);
#endif
            } while (selected < 0 && isInterrupted(lastSocketErrorCode()));

            if (selected == 0) {
                lastError = "connect timed out after " +
                            std::to_string(kConnectTimeoutSeconds) +
                            " seconds";
                closeSocket(candidateHandle);
                continue;
            }

            if (selected < 0) {
                lastError = "connect wait failed: " + lastSocketError();
                closeSocket(candidateHandle);
                continue;
            }

            // The socket is writable. ask the OS whether connect succeeded.
            int connectError = 0;
#ifdef _WIN32
            int length = sizeof(connectError);
            if (getsockopt(candidate, SOL_SOCKET, SO_ERROR,
                           reinterpret_cast<char*>(&connectError),
                           &length) != 0) {
                lastError = "cannot read connect result: " + lastSocketError();
                closeSocket(candidateHandle);
                continue;
            }
#else
            socklen_t length = sizeof(connectError);
            if (getsockopt(candidate, SOL_SOCKET, SO_ERROR, &connectError,
                           &length) != 0) {
                lastError = "cannot read connect result: " + lastSocketError();
                closeSocket(candidateHandle);
                continue;
            }
#endif

            if (connectError != 0) {
                lastError = "connect failed: " +
                            socketErrorText(connectError);
                closeSocket(candidateHandle);
                continue;
            }
        }

        // Connected. Switch back to blocking mode for simple sendAll logic.
        if (!setSocketBlocking(candidateHandle, true, stepError)) {
            lastError = stepError;
            closeSocket(candidateHandle);
            continue;
        }

        if (!setTcpNoDelay(candidate, stepError)) {
            lastError = stepError;
            closeSocket(candidateHandle);
            continue;
        }

        if (!setSocketSendTimeout(candidateHandle, kSendTimeoutMilliseconds,
                                  stepError)) {
            lastError = stepError;
            closeSocket(candidateHandle);
            continue;
        }

        socketHandle = candidateHandle;
        freeaddrinfo(addresses);
        return true;
    }

    freeaddrinfo(addresses);
    errorText = lastError;
    return false;
}

bool TcpStreamTransport::sendAll(const uint8_t* data, size_t size) {
    if (socketHandle == kInvalidSocket) {
        errorText = "socket is not connected";
        return false;
    }

    if (data == nullptr && size != 0) {
        errorText = "send buffer is null";
        return false;
    }

    const NativeSocket socketFd = native(socketHandle);
    size_t sent = 0;

    while (sent < size) {
        // MSG_NOSIGNAL stops Linux from killing the process with SIGPIPE when
        // the proxy has already closed the connection. Windows has no SIGPIPE.
        int flags = 0;
#ifndef _WIN32
#ifdef MSG_NOSIGNAL
        flags = MSG_NOSIGNAL;
#endif
#endif

        const auto result = send(
            socketFd,
            reinterpret_cast<const char*>(data + sent),
            static_cast<int>(size - sent),
            flags);

        if (result < 0) {
            const int code = lastSocketErrorCode();

            if (isInterrupted(code)) {
                continue;   // interrupted by a signal: try again
            }

            if (isSendTimeout(code)) {
                errorText = "send timed out";
                return false;
            }

            errorText = "send failed: " + socketErrorText(code);
            return false;
        }

        if (result == 0) {
            errorText = "connection closed while sending";
            return false;
        }

        sent += static_cast<size_t>(result);
    }

    errorText.clear();
    return true;
}

void TcpStreamTransport::close() {
    if (socketHandle != kInvalidSocket) {
        closeSocket(socketHandle);
        socketHandle = kInvalidSocket;
    }
}

std::string TcpStreamTransport::errorMessage() const {
    return errorText;
}
