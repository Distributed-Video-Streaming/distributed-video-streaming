#pragma once
#include <string>
#include "video_frame.h"

class IVideoSource {
public:
    virtual ~IVideoSource() {}

    virtual bool open(std::string path) = 0;

    virtual bool readFrame(VideoFrame& frame) = 0;

    virtual void close() = 0;

    virtual std::string errorMessage() = 0;
};