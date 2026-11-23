#pragma once

#include <cstdint>
#include <string>

#include "socket_platform.h"
#include "stream_transport.h"

// Blocking TCP connection to the Python proxy.
//
// connectTo() uses a short non-blocking connect internally so a dead proxy
// cannot block the program forever. After that the socket is blocking and
// sendAll() uses the OS send timeout.
class TcpStreamTransport : public IStreamTransport {
public:
    TcpStreamTransport() = default;
    ~TcpStreamTransport() override;

    // A socket owns an OS resource. Copying it would close the same socket
    // twice, so copying is forbidden.
    TcpStreamTransport(const TcpStreamTransport&) = delete;
    TcpStreamTransport& operator=(const TcpStreamTransport&) = delete;

    bool connectTo(const std::string& host, uint16_t port) override;
    bool sendAll(const uint8_t* data, size_t size) override;
    void close() override;
    std::string errorMessage() const override;

private:
    SocketHandle socketHandle = kInvalidSocket;
    std::string errorText;
};
