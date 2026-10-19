#include "video_frame.h"

size_t VideoFrame::expectedSize() const {
    if (width <= 0 || height <= 0) {
        return 0;
    }
    // every pixel uses 3 bytes: red, green, blue
    return (size_t)width * height * 3;
}

bool VideoFrame::isValid() const {
    if (expectedSize() == 0) {
        return false;
    }
    return data.size() == expectedSize();
}

void VideoFrame::clear() {
    width = 0;
    height = 0;
    frameNumber = 0;
    timestamps = 0;
    data.clear();
}