#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// Wire protocol constants.
//
// Every message is:
//
//   +----------------+----------------+------------------+----------------+
//   | type (4 bytes) | size (4 bytes) | sequence (8 bytes)| body (size N) |
//   +----------------+----------------+------------------+----------------+
//
// All numbers are big-endian ("network byte order"). The Python proxy can
// read the header with struct.unpack("!IIQ", header).
// ---------------------------------------------------------------------------

constexpr uint32_t kProtocolVersion = 1;

// Header: 4 + 4 + 8 = 16 bytes.
constexpr size_t kHeaderSize = 16;

// Biggest body we accept. This is checked before allocating memory.
constexpr uint32_t kMaxPayloadSize = 8 * 1024 * 1024;

// The numbers are part of the wire format. Never renumber them.
enum class MessageType : uint32_t {
    Hello = 1,
    StreamStart = 2,
    VideoData = 3,
    StreamEnd = 4,
    Error = 5,
    Goodbye = 6,
};

struct MessageHeader {
    MessageType type = MessageType::Hello;
    uint32_t payloadSize = 0;
    uint64_t sequence = 0;
};

// These structs make the body builders/parsers easier to read than raw bytes.
struct StreamStartInfo {
    uint32_t streamId = 0;
    uint32_t codec = 0;          // 1 = MJPEG
    uint32_t width = 0;
    uint32_t height = 0;
    uint32_t fpsNumerator = 0;
    uint32_t fpsDenominator = 1;
};

struct VideoDataInfo {
    uint64_t timestampMs = 0;
    uint32_t flags = 0;          // bit 0 = keyframe
    std::vector<uint8_t> jpeg;
};

struct ErrorInfo {
    uint32_t code = 0;
    std::string message;
};

bool isKnownMessageType(uint32_t value);
const char* messageTypeName(MessageType type);

// Build one complete message: 16-byte header + body.
// Returns an empty vector if the body is larger than kMaxPayloadSize.
std::vector<uint8_t> encodeMessage(MessageType type, uint64_t sequence,
                                   const std::vector<uint8_t>& payload);

// Read and validate one header from a buffer with at least kHeaderSize bytes.
// Rejects unknown types, oversized bodies, and truncated input.
bool decodeHeader(const uint8_t* data, size_t size,
                  MessageHeader& header, std::string& error);

// Body builders used by the video source.
std::vector<uint8_t> buildHelloPayload(uint32_t version);
std::vector<uint8_t> buildStreamStartPayload(const StreamStartInfo& info);
std::vector<uint8_t> buildVideoDataPayload(uint64_t timestampMs, uint32_t flags,
                                           const std::vector<uint8_t>& jpeg);
std::vector<uint8_t> buildStreamEndPayload(uint64_t totalFrames);
std::vector<uint8_t> buildErrorPayload(uint32_t code, const std::string& message);

// Body parsers used by the receiver. Each one checks the body size first and
// writes a readable error instead of reading past the end of the buffer.
bool parseHelloPayload(const uint8_t* data, size_t size, uint32_t& version,
                       std::string& error);
bool parseStreamStartPayload(const uint8_t* data, size_t size,
                             StreamStartInfo& info, std::string& error);
bool parseVideoDataPayload(const uint8_t* data, size_t size,
                           VideoDataInfo& info, std::string& error);
bool parseStreamEndPayload(const uint8_t* data, size_t size,
                           uint64_t& totalFrames, std::string& error);
bool parseErrorPayload(const uint8_t* data, size_t size,
                       ErrorInfo& info, std::string& error);
