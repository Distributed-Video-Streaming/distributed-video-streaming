#pragma once
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

// This is the wire format we agreed on with the Python team.
//
// Every message is a 9 byte header followed by a body:
//
//   byte 0      : message type
//   bytes 1..4  : body size in bytes
//   bytes 5..8  : sequence number
//   bytes 9..   : body
//
// All numbers are sent big endian (network byte order).
// A body is never bigger than 8 MB.
namespace protocol {

constexpr size_t kHeaderSize = 9;
constexpr size_t kMaxBodySize = 8 * 1024 * 1024;   // 8 MB
constexpr uint16_t kVersion = 1;
constexpr uint8_t kFormatJpeg = 1;

enum class MessageType : uint8_t {
    Hello = 1,        // body: uint16 protocol version
    StreamStart = 2,  // body: uint32 width, uint32 height, uint32 fps x1000, uint8 format
    VideoData = 3,    // body: uint64 timestamp in ms, then the JPEG bytes
    StreamEnd = 4,    // body: empty
    Error = 5,        // body: UTF-8 error text
    Goodbye = 6,      // body: empty
};

// One message, in memory. encodeMessage() turns it into bytes.
struct Message {
    MessageType type = MessageType::Hello;
    uint32_t sequence = 0;
    std::vector<unsigned char> body;
};

// Name of a message type, for log lines.
const char* messageTypeName(MessageType type);

// Message -> bytes, and bytes -> message.
// They return false and fill error when a message is bad.
bool encodeMessage(const Message& message, std::vector<unsigned char>& out, std::string& error);
bool decodeMessage(const unsigned char* data, size_t size, Message& out, std::string& error);

// Builders for the six messages. They fill the type and the body.
Message makeHello(uint32_t sequence);
Message makeStreamStart(uint32_t sequence, int width, int height, int fps);
Message makeVideoData(uint32_t sequence, long long timestampMs,
                      const std::vector<unsigned char>& jpeg);
Message makeStreamEnd(uint32_t sequence);
Message makeError(uint32_t sequence, const std::string& text);
Message makeGoodbye(uint32_t sequence);

} // namespace protocol
