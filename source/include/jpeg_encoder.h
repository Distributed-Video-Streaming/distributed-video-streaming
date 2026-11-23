#pragma once
#include <string>
#include <vector>
#include "video_frame.h"

// FFmpeg types are only used inside jpeg_encoder.cpp.
struct AVCodecContext;
struct AVFrame;
struct AVPacket;
struct SwsContext;

// Turns one RGB frame into one JPEG image.
class JpegEncoder {
public:
    JpegEncoder() = default;
    ~JpegEncoder() { close(); }

    // The encoder owns FFmpeg memory, so it must not be copied.
    JpegEncoder(const JpegEncoder&) = delete;
    JpegEncoder& operator=(const JpegEncoder&) = delete;

    // Fixes the frame size. Every frame given to encode() must have this size.
    bool open(int width, int height);
    bool encode(const VideoFrame& inputFrame, std::vector<unsigned char>& jpegBytes);
    void close();
    std::string errorMessage() const { return errorText; }

private:
    // Remember the error, free everything, and return false.
    bool fail(const std::string& text);

    AVCodecContext* codecContext = nullptr;
    AVFrame* yuvFrame = nullptr;
    AVPacket* packet = nullptr;
    SwsContext* converter = nullptr;
    std::string errorText;
};