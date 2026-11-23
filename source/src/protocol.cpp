#include "protocol.h"

namespace protocol {
namespace {

// Write a number in network byte order (big endian), using 4 or 8 bytes.
void putNumber(std::vector<unsigned char>& out, unsigned long long value, int bytes) {
    for (int shift = (bytes - 1) * 8; shift >= 0; shift -= 8) {
        out.push_back((unsigned char)((value >> shift) & 0xFF));
    }
}

// Read one number in network byte order (big endian).
unsigned int getU32(const unsigned char* data) {
    return ((unsigned int)data[0] << 24) | ((unsigned int)data[1] << 16) |
           ((unsigned int)data[2] << 8) | (unsigned int)data[3];
}

bool isKnownType(unsigned char value) {
    return value >= (unsigned char)MessageType::StreamStart &&
           value <= (unsigned char)MessageType::Error;
}

}

const char* messageTypeName(MessageType type) {
    switch (type) {
        case MessageType::StreamStart: return "STREAM_START";
        case MessageType::VideoData: return "VIDEO_DATA";
        case MessageType::StreamEnd: return "STREAM_END";
        case MessageType::Error: return "ERROR";
    }
    return "UNKNOWN";
}

bool encodeMessage(const Message& message, std::vector<unsigned char>& out, std::string& error) {
    if (!isKnownType((unsigned char)message.type)) {
        error = "unknown message type";
        return false;
    }
    if (message.body.size() > kMaxBodySize) {
        error = "message body is too large";
        return false;
    }

    out.clear();
    out.reserve(kHeaderSize + message.body.size());
    out.push_back((unsigned char)message.type);
    putNumber(out, message.body.size(), 4);
    putNumber(out, message.sequence, 4);
    out.insert(out.end(), message.body.begin(), message.body.end());
    return true;
}

bool decodeMessage(const unsigned char* data, size_t size, Message& out, std::string& error) {
    if (data == NULL || size < kHeaderSize) {
        error = "header is truncated";
        return false;
    }
    if (!isKnownType(data[0])) {
        error = "unknown message type";
        return false;
    }

    unsigned int bodySize = getU32(data + 1);
    if (bodySize > kMaxBodySize) {
        error = "message body is too large";
        return false;
    }
    if (size < kHeaderSize + bodySize) {
        error = "message is truncated";
        return false;
    }

    out.type = (MessageType)data[0];
    out.sequence = getU32(data + 5);
    out.body.assign(data + kHeaderSize, data + kHeaderSize + bodySize);
    return true;
}

Message makeStreamStart(uint32_t sequence, int width, int height, int fps) {
    Message message;
    message.type = MessageType::StreamStart;
    message.sequence = sequence;
    putNumber(message.body, (unsigned int)width, 4);
    putNumber(message.body, (unsigned int)height, 4);
    putNumber(message.body, (unsigned int)(fps * 1000), 4);
    return message;
}

Message makeVideoData(uint32_t sequence, long long timestampMs,
                      const std::vector<unsigned char>& jpeg) {
    Message message;
    message.type = MessageType::VideoData;
    message.sequence = sequence;
    putNumber(message.body, (unsigned long long)timestampMs, 8);
    message.body.insert(message.body.end(), jpeg.begin(), jpeg.end());
    return message;
}

Message makeStreamEnd(uint32_t sequence) {
    Message message;
    message.type = MessageType::StreamEnd;
    message.sequence = sequence;
    return message;
}

Message makeError(uint32_t sequence, const std::string& text) {
    Message message;
    message.type = MessageType::Error;
    message.sequence = sequence;
    message.body.assign(text.begin(), text.end());
    return message;
}

}