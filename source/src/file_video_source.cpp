#include "file_video_source.h"

FileVideoSource::FileVideoSource() {
    formatContext = NULL;
    codecContext = NULL;
    frame = NULL;
    packet = NULL;
    converter = NULL;
    videoStreamIndex = -1;
    frameCount = 0;
    fileEnded = false;
}

FileVideoSource::~FileVideoSource() {
    close();   
}

std::string FileVideoSource::errorMessage() {
    return errorText;
}

bool FileVideoSource::open(std::string path) {
    close();               
    errorText = "";
    frameCount = 0;
    fileEnded = false;

    int result = avformat_open_input(&formatContext, path.c_str(), NULL, NULL);
    if (result < 0) {
        char text[128];
        av_strerror(result, text, sizeof(text));  
        errorText = "Cannot open file " + path + ": " + text;
        close();
        return false;
    }

    result = avformat_find_stream_info(formatContext, NULL);
    if (result < 0) {
        errorText = "Cannot read stream information";
        close();
        return false;
    }

    videoStreamIndex = av_find_best_stream(formatContext, AVMEDIA_TYPE_VIDEO, -1, -1, NULL, 0);
    if (videoStreamIndex < 0) {
        errorText = "No video found in this file";
        close();
        return false;
    }

    AVCodecParameters* parameters = formatContext->streams[videoStreamIndex]->codecpar;
    const AVCodec* decoder = avcodec_find_decoder(parameters->codec_id);
    if (decoder == NULL) {
        errorText = "No decoder for this video format";
        close();
        return false;
    }

    codecContext = avcodec_alloc_context3(decoder);
    if (codecContext == NULL) {
        errorText = "Cannot create decoder";
        close();
        return false;
    }

    result = avcodec_parameters_to_context(codecContext, parameters);
    if (result < 0) {
        errorText = "Cannot set up decoder";
        close();
        return false;
    }

    result = avcodec_open2(codecContext, decoder, NULL);
    if (result < 0) {
        errorText = "Cannot open decoder";
        close();
        return false;
    }

    packet = av_packet_alloc();
    frame = av_frame_alloc();
    if (packet == NULL || frame == NULL) {
        errorText = "Out of memory";
        close();
        return false;
    }

    return true;
}

bool FileVideoSource::readFrame(VideoFrame& outFrame) {
    if (formatContext == NULL) {
        errorText = "Video is not open";
        return false;
    }

    while (true) {
        int result = avcodec_receive_frame(codecContext, frame);

        if (result == 0) {

            converter = sws_getCachedContext(converter,
                frame->width, frame->height, (AVPixelFormat)frame->format,   
                frame->width, frame->height, AV_PIX_FMT_RGB24,               
                SWS_BILINEAR, NULL, NULL, NULL);
            if (converter == NULL) {
                errorText = "Cannot create color converter";
                return false;
            }

            outFrame.width = frame->width;
            outFrame.height = frame->height;
            outFrame.data.resize(outFrame.expectedSize());   

            unsigned char* destination[1] = { outFrame.data.data() };
            int bytesPerRow[1] = { frame->width * 3 };
            sws_scale(converter, frame->data, frame->linesize, 0, frame->height,
                      destination, bytesPerRow);

            AVRational timeBase = formatContext->streams[videoStreamIndex]->time_base;
            long long pts = frame->best_effort_timestamp;
            if (pts == AV_NOPTS_VALUE) {
                outFrame.timestamps = 0;
            } else {
                outFrame.timestamps = (long long)(pts * av_q2d(timeBase) * 1000.0);
            }

            outFrame.frameNumber = frameCount;
            frameCount = frameCount + 1;

            av_frame_unref(frame);   
            return true;
        }

        if (result == AVERROR_EOF) {
            return false;            
        }

        if (result != AVERROR(EAGAIN)) {
            errorText = "Error while decoding";
            return false;
        }

        if (fileEnded) {
            return false;
        }

        result = av_read_frame(formatContext, packet);
        if (result < 0) {
            avcodec_send_packet(codecContext, NULL);
            fileEnded = true;
            continue;
        }

        // Only send video packets (ignore audio)
        if (packet->stream_index == videoStreamIndex) {
            result = avcodec_send_packet(codecContext, packet);
            if (result < 0) {
                av_packet_unref(packet);
                errorText = "Error sending data to the decoder";
                return false;
            }
        }
        av_packet_unref(packet);   
    }
}

void FileVideoSource::close() {
    if (converter != NULL) {
        sws_freeContext(converter);
        converter = NULL;
    }
    if (frame != NULL) {
        av_frame_free(&frame);
    }
    if (packet != NULL) {
        av_packet_free(&packet);
    }
    if (codecContext != NULL) {
        avcodec_free_context(&codecContext);
    }
    if (formatContext != NULL) {
        avformat_close_input(&formatContext);
    }
    videoStreamIndex = -1;
}