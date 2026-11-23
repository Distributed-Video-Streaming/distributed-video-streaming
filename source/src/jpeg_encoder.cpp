#include "jpeg_encoder.h"

// because FFmpeg written in c i used extern "C"
extern "C" {
    #include <libavcodec/avcodec.h>
    #include <libswscale/swscale.h>
}

// Smaller number means better quality and bigger JPEG files (1 to 31).
const int kQuality = 5;

bool JpegEncoder::fail(const std::string& text) {
    close();
    errorText = text;
    return false;
}

bool JpegEncoder::open(int width, int height) {
    close();
    errorText = "";

    if (width <= 0 || height <= 0) {
        return fail("Invalid frame size");
    }
    if ((width % 2 != 0) || (height % 2 != 0)) {
        return fail("JPEG needs even width and height");
    }

    const AVCodec* encoder = avcodec_find_encoder(AV_CODEC_ID_MJPEG);
    if (encoder == NULL) {
        return fail("No JPEG encoder in this FFmpeg build");
    }

    codecContext = avcodec_alloc_context3(encoder);
    if (codecContext == NULL) {
        return fail("Cannot create JPEG encoder");
    }

    codecContext->width = width;
    codecContext->height = height;
    codecContext->time_base = AVRational{1, 25};   // FFmpeg wants a time base
    codecContext->pix_fmt = AV_PIX_FMT_YUV420P;
    codecContext->color_range = AVCOL_RANGE_JPEG;   // normal JPEG colors
    codecContext->flags |= AV_CODEC_FLAG_QSCALE;
    codecContext->global_quality = FF_QP2LAMBDA * kQuality;

    if (avcodec_open2(codecContext, encoder, NULL) < 0) {
        return fail("Cannot open JPEG encoder");
    }

    yuvFrame = av_frame_alloc();
    packet = av_packet_alloc();
    if (yuvFrame == NULL || packet == NULL) {
        return fail("Out of memory");
    }
    yuvFrame->format = codecContext->pix_fmt;
    yuvFrame->width = width;
    yuvFrame->height = height;
    if (av_frame_get_buffer(yuvFrame, 32) < 0) {
        return fail("Cannot allocate JPEG frame");
    }

    converter = sws_getContext(
        width, height, AV_PIX_FMT_RGB24,
        width, height, codecContext->pix_fmt,
        SWS_BILINEAR, NULL, NULL, NULL);
    if (converter == NULL) {
        return fail("Cannot create color converter");
    }
    return true;
}

bool JpegEncoder::encode(const VideoFrame& inputFrame, std::vector<unsigned char>& jpegBytes) {
    jpegBytes.clear();

    if (codecContext == NULL) {
        errorText = "Encoder is not open";
        return false;
    }
    if (!inputFrame.isValid()) {
        errorText = "Frame is not valid";
        return false;
    }
    if (inputFrame.width != codecContext->width || inputFrame.height != codecContext->height) {
        errorText = "Frame size does not match the encoder";
        return false;
    }
    if (av_frame_make_writable(yuvFrame) < 0) {
        errorText = "Cannot write to the JPEG frame";
        return false;
    }

    // RGB -> YUV, then YUV -> JPEG
    const uint8_t* sourceData[1] = { inputFrame.data.data() };
    int sourceLines[1] = { inputFrame.width * 3 };
    sws_scale(converter, sourceData, sourceLines, 0, inputFrame.height,
              yuvFrame->data, yuvFrame->linesize);

    if (avcodec_send_frame(codecContext, yuvFrame) < 0) {
        errorText = "Error sending frame to the JPEG encoder";
        return false;
    }
    // MJPEG gives exactly one packet for every frame.
    if (avcodec_receive_packet(codecContext, packet) < 0) {
        errorText = "Error encoding the JPEG frame";
        return false;
    }

    // Copy the JPEG bytes out of FFmpeg before the packet is freed.
    jpegBytes.assign(packet->data, packet->data + packet->size);
    av_packet_unref(packet);
    return true;
}

void JpegEncoder::close() {
    // These FFmpeg functions are safe to call with NULL.
    sws_freeContext(converter);
    converter = NULL;
    av_packet_free(&packet);
    av_frame_free(&yuvFrame);
    avcodec_free_context(&codecContext);
}