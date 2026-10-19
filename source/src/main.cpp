#include <iostream>
#include "file_video_source.h"

int main() {
    FileVideoSource video;

    if (!video.open("../test.mp4")) {
        std::cout << "Error: " << video.errorMessage() << "\n";
    }

    VideoFrame frame;
    int count = 0;

    while (video.readFrame(frame)) {
        if (count == 0) {
            std::cout << "First frame: " << frame.width << "x" << frame.height << "\n";
        }
        if (!frame.isValid()) {
            std::cout << "Bad frame at number " << count << "\n";
            break;
        }
        count = count + 1;
    }

    std::cout << "Frames read: " << count << "\n";  
    video.close();

    // testing with a file that's doesn't exist
    FileVideoSource video2;
    if (!video2.open("test2.mp4")) {
        std::cout << "Expected error: " << video2.errorMessage() << std::endl;
    }

    return 0;
}