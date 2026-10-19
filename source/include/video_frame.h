#pragma once
#include <vector>

struct VideoFrame {
    int width = 0;                       
    int height = 0;                      
    long long frameNumber = 0;           
    long long timestamps = 0;           
    std::vector<unsigned char> data;

    size_t expectedSize() const;

    bool isValid() const;

    void clear();
};