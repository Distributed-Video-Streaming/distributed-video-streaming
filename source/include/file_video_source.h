#pragma once
#include <string>
#include "video_source.h"

// FFmpeg types are only used inside file_video_source.cpp.
// Other files include this header without needing the FFmpeg headers.
struct AVCodecContext;
struct AVFormatContext;
struct AVFrame;
struct AVPacket;
struct SwsContext;

// Reads a video from a file using FFmpeg
class FileVideoSource : public IVideoSource {
public:
    FileVideoSource();
    ~FileVideoSource();

    // This class owns FFmpeg memory, so copying it would free the same memory twice.
    FileVideoSource(const FileVideoSource&) = delete;
    FileVideoSource& operator=(const FileVideoSource&) = delete;

    bool open(const std::string& path) override;
    bool readFrame(VideoFrame& outputFrame) override;
    void close() override;
    std::string errorMessage() const override;

    int width() const override;
    int height() const override;
    double frameRate() const override;

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

    int videoWidth;                   
    int videoHeight;                  
    double videoFrameRate;            
};
