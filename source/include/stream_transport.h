#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

// The streamer talks to this interface, not directly to sockets.
// That keeps the networking code in one place and makes the streamer easy to
// reason about.
class IStreamTransport {
public:
    virtual ~IStreamTransport();

    // Connect to host:port.
    // Returns false and sets errorMessage() when it fails.
    virtual bool connectTo(const std::string& host, uint16_t port) = 0;

    // Send every byte. The implementation must handle partial sends.
    virtual bool sendAll(const uint8_t* data, size_t size) = 0;

    // Close the connection. Safe to call more than once.
    virtual void close() = 0;

    // Last error text. Empty after a successful operation.
    virtual std::string errorMessage() const = 0;
};
