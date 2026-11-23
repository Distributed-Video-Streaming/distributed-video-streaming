#include "protocol.h"

// All helpers below are private to this file. The rest of the program uses
// the typed builders/parsers from protocol.h, so it never has to think about
// byte offsets.
namespace {

// Append a 32-bit number in big-endian order (most significant byte first).
void appendU32(std::vector<uint8_t>& out, uint32_t value) {
    out.push_back(static_cast<uint8_t>((value >> 24) & 0xFF));
    out.push_back(static_cast<uint8_t>((value >> 16) & 0xFF));
    out.push_back(static_cast<uint8_t>((value >> 8) & 0xFF));
    out.push_back(static_cast<uint8_t>(value & 0xFF));
}

// Append a 64-bit number in big-endian order.
void appendU64(std::vector<uint8_t>& out, uint64_t value) {
    for (int shift = 56; shift >= 0; shift -= 8) {
        out.push_back(static_cast<uint8_t>((value >> shift) & 0xFF));
    }
}

// Read a 32-bit big-endian number. The caller must have checked the size.
uint32_t readU32(const uint8_t* data) {
    return (static_cast<uint32_t>(data[0]) << 24) |
           (static_cast<uint32_t>(data[1]) << 16) |
           (static_cast<uint32_t>(data[2]) << 8) |
           static_cast<uint32_t>(data[3]);
}

// Read a 64-bit big-endian number. The caller must have checked the size.
uint64_t readU64(const uint8_t* data) {
    uint64_t value = 0;
    for (int i = 0; i < 8; ++i) {
        value = (value << 8) | static_cast<uint64_t>(data[i]);
    }
    return value;
}

// Small helper so every parser gives the same style of size error.
bool requireSize(size_t actual, size_t expected, const char* what,
                 std::string& error) {
    if (actual != expected) {
        error = std::string(what) + " must be " + std::to_string(expected) +
                " bytes, got " + std::to_string(actual);
        return false;
    }
    return true;
}

} // namespace

bool isKnownMessageType(uint32_t value) {
    // The enum values are the wire values, so this stays in sync with
    // enum class MessageType automatically.
    switch (value) {
    case static_cast<uint32_t>(MessageType::Hello):
    case static_cast<uint32_t>(MessageType::StreamStart):
    case static_cast<uint32_t>(MessageType::VideoData):
    case static_cast<uint32_t>(MessageType::StreamEnd):
    case static_cast<uint32_t>(MessageType::Error):
    case static_cast<uint32_t>(MessageType::Goodbye):
        return true;
    default:
        return false;
    }
}

const char* messageTypeName(MessageType type) {
    switch (type) {
    case MessageType::Hello:       return "HELLO";
    case MessageType::StreamStart: return "STREAM_START";
    case MessageType::VideoData:   return "VIDEO_DATA";
    case MessageType::StreamEnd:   return "STREAM_END";
    case MessageType::Error:       return "ERROR";
    case MessageType::Goodbye:     return "GOODBYE";
    }
    return "UNKNOWN";
}

std::vector<uint8_t> encodeMessage(MessageType type, uint64_t sequence,
                                   const std::vector<uint8_t>& payload) {
    // Refuse unknown types. This should never happen with a valid enum, but a
    // cast could produce one.
    if (!isKnownMessageType(static_cast<uint32_t>(type))) {
        return {};
    }

    // Check the body size before building a large buffer.
    if (payload.size() > kMaxPayloadSize) {
        return {};
    }

    std::vector<uint8_t> message;
    message.reserve(kHeaderSize + payload.size());

    appendU32(message, static_cast<uint32_t>(type));
    appendU32(message, static_cast<uint32_t>(payload.size()));
    appendU64(message, sequence);

    message.insert(message.end(), payload.begin(), payload.end());
    return message;
}

bool decodeHeader(const uint8_t* data, size_t size, MessageHeader& header,
                  std::string& error) {
    if (data == nullptr) {
        error = "message header is null";
        return false;
    }

    if (size < kHeaderSize) {
        error = "message header is truncated: got " + std::to_string(size) +
                " of " + std::to_string(kHeaderSize) + " bytes";
        return false;
    }

    const uint32_t typeValue = readU32(data);
    const uint32_t payloadSize = readU32(data + 4);
    const uint64_t sequence = readU64(data + 8);

    if (!isKnownMessageType(typeValue)) {
        error = "unknown message type " + std::to_string(typeValue);
        return false;
    }

    if (payloadSize > kMaxPayloadSize) {
        error = "message body is too large: " + std::to_string(payloadSize) +
                " bytes";
        return false;
    }

    header.type = static_cast<MessageType>(typeValue);
    header.payloadSize = payloadSize;
    header.sequence = sequence;
    return true;
}

// ------------------------------- builders ---------------------------------

std::vector<uint8_t> buildHelloPayload(uint32_t version) {
    std::vector<uint8_t> payload;
    appendU32(payload, version);
    return payload;
}

std::vector<uint8_t> buildStreamStartPayload(const StreamStartInfo& info) {
    std::vector<uint8_t> payload;
    appendU32(payload, info.streamId);
    appendU32(payload, info.codec);
    appendU32(payload, info.width);
    appendU32(payload, info.height);
    appendU32(payload, info.fpsNumerator);
    appendU32(payload, info.fpsDenominator);
    return payload;
}

std::vector<uint8_t> buildVideoDataPayload(uint64_t timestampMs, uint32_t flags,
                                           const std::vector<uint8_t>& jpeg) {
    std::vector<uint8_t> payload;
    payload.reserve(12 + jpeg.size());
    appendU64(payload, timestampMs);
    appendU32(payload, flags);
    payload.insert(payload.end(), jpeg.begin(), jpeg.end());
    return payload;
}

std::vector<uint8_t> buildStreamEndPayload(uint64_t totalFrames) {
    std::vector<uint8_t> payload;
    appendU64(payload, totalFrames);
    return payload;
}

std::vector<uint8_t> buildErrorPayload(uint32_t code,
                                       const std::string& message) {
    std::vector<uint8_t> payload;
    payload.reserve(8 + message.size());
    appendU32(payload, code);
    appendU32(payload, static_cast<uint32_t>(message.size()));
    payload.insert(payload.end(), message.begin(), message.end());
    return payload;
}

// -------------------------------- parsers ---------------------------------

bool parseHelloPayload(const uint8_t* data, size_t size, uint32_t& version,
                       std::string& error) {
    if (!requireSize(size, 4, "HELLO body", error)) {
        return false;
    }
    if (data == nullptr) {
        error = "HELLO body is null";
        return false;
    }
    version = readU32(data);
    return true;
}

bool parseStreamStartPayload(const uint8_t* data, size_t size,
                             StreamStartInfo& info, std::string& error) {
    if (!requireSize(size, 24, "STREAM_START body", error)) {
        return false;
    }
    if (data == nullptr) {
        error = "STREAM_START body is null";
        return false;
    }

    info.streamId = readU32(data);
    info.codec = readU32(data + 4);
    info.width = readU32(data + 8);
    info.height = readU32(data + 12);
    info.fpsNumerator = readU32(data + 16);
    info.fpsDenominator = readU32(data + 20);
    return true;
}

bool parseVideoDataPayload(const uint8_t* data, size_t size,
                           VideoDataInfo& info, std::string& error) {
    // 8 bytes timestamp + 4 bytes flags + at least 0 bytes of JPEG.
    if (size < 12) {
        error = "VIDEO_DATA body needs at least 12 bytes, got " +
                std::to_string(size);
        return false;
    }
    if (data == nullptr) {
        error = "VIDEO_DATA body is null";
        return false;
    }

    info.timestampMs = readU64(data);
    info.flags = readU32(data + 8);
    info.jpeg.assign(data + 12, data + size);
    return true;
}

bool parseStreamEndPayload(const uint8_t* data, size_t size,
                           uint64_t& totalFrames, std::string& error) {
    if (!requireSize(size, 8, "STREAM_END body", error)) {
        return false;
    }
    if (data == nullptr) {
        error = "STREAM_END body is null";
        return false;
    }
    totalFrames = readU64(data);
    return true;
}

bool parseErrorPayload(const uint8_t* data, size_t size, ErrorInfo& info,
                       std::string& error) {
    // 4 bytes code + 4 bytes message length + message bytes.
    if (size < 8) {
        error = "ERROR body needs at least 8 bytes, got " +
                std::to_string(size);
        return false;
    }
    if (data == nullptr) {
        error = "ERROR body is null";
        return false;
    }

    const uint32_t code = readU32(data);
    const uint32_t length = readU32(data + 4);

    if (static_cast<size_t>(length) != size - 8) {
        error = "ERROR text length does not match the body size";
        return false;
    }

    info.code = code;
    info.message.assign(reinterpret_cast<const char*>(data + 8), length);
    return true;
}
