#pragma once
#include <string>
#include "video_frame.h"

class IVideoSource {
public:
    virtual ~IVideoSource() {}

    virtual bool open(const std::string& path) = 0;

    virtual bool readFrame(VideoFrame& outputFrame) = 0;

    virtual void close() = 0;

    virtual std::string errorMessage() const = 0;

    // Video information, valid after open() succeeds
    virtual int width() const = 0;

    virtual int height() const = 0;

    virtual double frameRate() const = 0;
};
