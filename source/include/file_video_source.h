#pragma once
#include <string>
#include "video_source.h"

// because FFmpeg written in c i used extern "C" 
extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>
}

// Reads a video from a file using FFmpeg
class FileVideoSource : public IVideoSource {
public:
    FileVideoSource();
    ~FileVideoSource();

    bool open(std::string path);
    bool readFrame(VideoFrame& frame);
    void close();
    std::string errorMessage();

private:
    AVFormatContext* formatContext;   
    AVCodecContext* codecContext;     
    AVFrame* frame;                   
    AVPacket* packet;                 
    SwsContext* converter;            

    int videoStreamIndex;             
    long long frameCount;             
    bool fileEnded;                   
    std::string errorText;            
};