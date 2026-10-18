#include <gtest/gtest.h>
#include <memory>
#include <string>
#include "video_source.h"

// A fake source made only for testing. It gives 3 small frames.
// This checks that IVideoSource can be used the way the app wants
// (through a base pointer) without needing FFmpeg or a real file.
class FakeVideoSource : public IVideoSource {
public:
    bool open(std::string path) override {
        if (path.empty()) {
            error = "empty path";
            return false;
        }
        error = "";
        sent = 0;
        isOpen = true;
        return true;
    }

    bool readFrame(VideoFrame& frame) override {
        if (!isOpen || sent >= 3) {
            return false;
        }
        frame.width = 2;
        frame.height = 2;
        frame.data.assign(12, 0);
        frame.frameNumber = sent;
        sent++;
        return true;
    }

    void close() override { isOpen = false; }

    std::string errorMessage() override { return error; }

    static int destroyed;
    ~FakeVideoSource() override { destroyed++; }

private:
    bool isOpen = false;
    int sent = 0;
    std::string error;
};

int FakeVideoSource::destroyed = 0;

TEST(VideoSourceInterfaceTest, WorksThroughBasePointer) {
    std::unique_ptr<IVideoSource> source(new FakeVideoSource());
    ASSERT_TRUE(source->open("anything.mp4"));

    VideoFrame frame;
    int count = 0;
    while (source->readFrame(frame)) {
        EXPECT_TRUE(frame.isValid());
        EXPECT_EQ(frame.frameNumber, count);
        count++;
    }
    EXPECT_EQ(count, 3);
}

TEST(VideoSourceInterfaceTest, OpenFailureGivesErrorMessage) {
    std::unique_ptr<IVideoSource> source(new FakeVideoSource());
    EXPECT_FALSE(source->open(""));
    EXPECT_FALSE(source->errorMessage().empty());
}

TEST(VideoSourceInterfaceTest, NoFramesAfterClose) {
    std::unique_ptr<IVideoSource> source(new FakeVideoSource());
    ASSERT_TRUE(source->open("x.mp4"));
    source->close();

    VideoFrame frame;
    EXPECT_FALSE(source->readFrame(frame));
}

TEST(VideoSourceInterfaceTest, DestructorIsVirtual) {
    // If ~IVideoSource was not virtual, deleting through the base
    // pointer would NOT call the derived destructor.
    FakeVideoSource::destroyed = 0;
    {
        std::unique_ptr<IVideoSource> source(new FakeVideoSource());
    }
    EXPECT_EQ(FakeVideoSource::destroyed, 1);
}
