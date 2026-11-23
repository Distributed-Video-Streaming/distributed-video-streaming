#include "socket_platform.h"

#include <string>

// ---------------------------------------------------------------------------
// Platform-specific socket headers.
//
// Everything else in the program uses SocketHandle and the small functions
// below, so only this file needs to know about Winsock vs POSIX.
// ---------------------------------------------------------------------------
#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#else
#include <cerrno>
#include <cstring>
#include <fcntl.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>
#endif

int lastSocketErrorCode() {
#ifdef _WIN32
    return WSAGetLastError();
#else
    return errno;
#endif
}

std::string socketErrorText(int code) {
#ifdef _WIN32
    // FormatMessage turns a Winsock error number into readable text.
    char buffer[256] = {};
    DWORD length = FormatMessageA(
        FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
        nullptr,
        static_cast<DWORD>(code),
        0,
        buffer,
        static_cast<DWORD>(sizeof(buffer)),
        nullptr);

    if (length == 0) {
        return "Windows socket error " + std::to_string(code);
    }

    std::string text(buffer, length);
    while (!text.empty() && (text.back() == '\n' || text.back() == '\r')) {
        text.pop_back();
    }
    return text;
#else
    return std::string(std::strerror(code));
#endif
}

std::string lastSocketError() {
    return socketErrorText(lastSocketErrorCode());
}

bool startSocketSystem(std::string& error) {
#ifdef _WIN32
    // Winsock needs one global startup call per process.
    static bool started = false;
    if (!started) {
        WSADATA data;
        const int result = WSAStartup(MAKEWORD(2, 2), &data);
        if (result != 0) {
            error = "WSAStartup failed: " + socketErrorText(result);
            return false;
        }
        started = true;
    }
#else
    // On Linux there is nothing to initialize.
    (void)error;
#endif
    return true;
}

void closeSocket(SocketHandle socket) {
    if (socket == kInvalidSocket) {
        return;
    }
#ifdef _WIN32
    closesocket(static_cast<SOCKET>(socket));
#else
    ::close(static_cast<int>(socket));
#endif
}

bool setSocketBlocking(SocketHandle socket, bool blocking, std::string& error) {
#ifdef _WIN32
    u_long mode = blocking ? 0 : 1;
    if (ioctlsocket(static_cast<SOCKET>(socket), FIONBIO, &mode) != 0) {
        error = "cannot change socket mode: " + lastSocketError();
        return false;
    }
#else
    const int fd = static_cast<int>(socket);
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0) {
        error = "cannot read socket flags: " + lastSocketError();
        return false;
    }

    if (blocking) {
        flags &= ~O_NONBLOCK;
    } else {
        flags |= O_NONBLOCK;
    }

    if (fcntl(fd, F_SETFL, flags) < 0) {
        error = "cannot change socket mode: " + lastSocketError();
        return false;
    }
#endif
    return true;
}

bool setSocketSendTimeout(SocketHandle socket, int milliseconds,
                          std::string& error) {
#ifdef _WIN32
    // Winsock expects a DWORD number of milliseconds.
    DWORD timeout = static_cast<DWORD>(milliseconds);
    if (setsockopt(static_cast<SOCKET>(socket), SOL_SOCKET, SO_SNDTIMEO,
                   reinterpret_cast<const char*>(&timeout),
                   sizeof(timeout)) != 0) {
        error = "cannot set send timeout: " + lastSocketError();
        return false;
    }
#else
    // POSIX expects a timeval.
    timeval timeout{};
    timeout.tv_sec = milliseconds / 1000;
    timeout.tv_usec = (milliseconds % 1000) * 1000;
    if (setsockopt(static_cast<int>(socket), SOL_SOCKET, SO_SNDTIMEO,
                   &timeout, sizeof(timeout)) != 0) {
        error = "cannot set send timeout: " + lastSocketError();
        return false;
    }
#endif
    return true;
}
