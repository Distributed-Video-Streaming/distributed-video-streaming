#pragma once

#include <cstdint>
#include <string>

// One neutral handle type for both Linux (int file descriptor) and Windows
// (SOCKET). The OS-specific cast happens only inside the .cpp files.
using SocketHandle = std::intptr_t;

// -1 means "no socket". On Windows this is also the value of INVALID_SOCKET
// after casting it to the native type.
constexpr SocketHandle kInvalidSocket = -1;

// Call once before creating sockets. On Linux this does nothing; on Windows
// it runs WSAStartup. Calling it more than once is safe.
bool startSocketSystem(std::string& error);

// Number of the most recent failed socket call (errno or WSAGetLastError).
int lastSocketErrorCode();

// Readable text for a socket error number.
std::string socketErrorText(int code);

// Readable text for the most recent socket error.
std::string lastSocketError();

// Close a socket. Does nothing for kInvalidSocket, so it is safe to call twice.
void closeSocket(SocketHandle socket);

// Switch a socket between blocking and non-blocking mode.
bool setSocketBlocking(SocketHandle socket, bool blocking, std::string& error);

// Set how long a blocking send may wait before reporting a timeout.
bool setSocketSendTimeout(SocketHandle socket, int milliseconds,
                          std::string& error);
