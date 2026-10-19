#include <gtest/gtest.h>
#include <string>
#include "file_video_source.h"

// Test files are in tests/data (made with ffmpeg):
//   sample.mp4     320x240, 10 fps, 1 second = exactly 10 frames, no audio
//   audio_only.wav sound only, no video stream
//   not_a_video.mp4 a text file with .mp4 name
//   empty.mp4      empty file
static std::string dataFile(const std::string& name) {
    return std::string(TEST_DATA_DIR) + "/" + name;
}

// ---------- open() : failure cases ----------

TEST(FileVideoSourceTest, OpenMissingFileFails) {
    FileVideoSource source;
    EXPECT_FALSE(source.open(dataFile("does_not_exist.mp4")));
}

TEST(FileVideoSourceTest, OpenMissingFileSetsErrorWithPath) {
    FileVideoSource source;
    std::string path = dataFile("does_not_exist.mp4");
    ASSERT_FALSE(source.open(path));
    EXPECT_NE(source.errorMessage().find("Cannot open file"), std::string::npos);
    EXPECT_NE(source.errorMessage().find("does_not_exist.mp4"), std::string::npos);
}

TEST(FileVideoSourceTest, OpenEmptyPathFails) {
    FileVideoSource source;
    EXPECT_FALSE(source.open(""));
    EXPECT_FALSE(source.errorMessage().empty());
}

TEST(FileVideoSourceTest, OpenTextFileWithMp4NameFails) {
    FileVideoSource source;
    EXPECT_FALSE(source.open(dataFile("not_a_video.mp4")));
    EXPECT_FALSE(source.errorMessage().empty());
}

TEST(FileVideoSourceTest, OpenEmptyFileFails) {
    FileVideoSource source;
    EXPECT_FALSE(source.open(dataFile("empty.mp4")));
    EXPECT_FALSE(source.errorMessage().empty());
}

TEST(FileVideoSourceTest, OpenAudioOnlyFileFailsWithNoVideoMessage) {
    FileVideoSource source;
    EXPECT_FALSE(source.open(dataFile("audio_only.wav")));
    EXPECT_EQ(source.errorMessage(), "No video found in this file");
}

// ---------- open() : success ----------

TEST(FileVideoSourceTest, OpenValidFileSucceeds) {
    FileVideoSource source;
    EXPECT_TRUE(source.open(dataFile("sample.mp4")));
}

TEST(FileVideoSourceTest, ErrorMessageEmptyAfterSuccessfulOpen) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    EXPECT_TRUE(source.errorMessage().empty());
}

TEST(FileVideoSourceTest, ErrorMessageEmptyOnNewObject) {
    FileVideoSource source;
    EXPECT_TRUE(source.errorMessage().empty());
}

TEST(FileVideoSourceTest, ErrorIsClearedByNextSuccessfulOpen) {
    FileVideoSource source;
    ASSERT_FALSE(source.open(dataFile("does_not_exist.mp4")));
    ASSERT_FALSE(source.errorMessage().empty());

    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    EXPECT_TRUE(source.errorMessage().empty());
}

// ---------- readFrame() ----------

TEST(FileVideoSourceTest, ReadFrameBeforeOpenFails) {
    FileVideoSource source;
    VideoFrame frame;
    EXPECT_FALSE(source.readFrame(frame));
    EXPECT_EQ(source.errorMessage(), "Video is not open");
}

TEST(FileVideoSourceTest, ReadFrameAfterFailedOpenFails) {
    FileVideoSource source;
    ASSERT_FALSE(source.open(dataFile("does_not_exist.mp4")));
    VideoFrame frame;
    EXPECT_FALSE(source.readFrame(frame));
}

TEST(FileVideoSourceTest, FirstFrameHasCorrectSize) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    ASSERT_TRUE(source.readFrame(frame));
    EXPECT_EQ(frame.width, 320);
    EXPECT_EQ(frame.height, 240);
    EXPECT_EQ(frame.data.size(), 320u * 240u * 3u);
    EXPECT_TRUE(frame.isValid());
}

TEST(FileVideoSourceTest, FirstFrameNumberAndTimestampAreZero) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    ASSERT_TRUE(source.readFrame(frame));
    EXPECT_EQ(frame.frameNumber, 0);
    EXPECT_EQ(frame.timestamps, 0);
}

TEST(FileVideoSourceTest, FrameContainsRealPixels) {
    // the test video is a color pattern, so it can not be all zeros
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    ASSERT_TRUE(source.readFrame(frame));

    bool foundNonZero = false;
    for (size_t i = 0; i < frame.data.size(); i++) {
        if (frame.data[i] != 0) {
            foundNonZero = true;
            break;
        }
    }
    EXPECT_TRUE(foundNonZero);
}

TEST(FileVideoSourceTest, ReadsAllTenFramesThenStops) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    int count = 0;
    while (source.readFrame(frame)) {
        count++;
        ASSERT_LT(count, 1000) << "reading never ends";
    }
    EXPECT_EQ(count, 10);
}

TEST(FileVideoSourceTest, EveryFrameIsValid) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    int count = 0;
    while (source.readFrame(frame)) {
        EXPECT_TRUE(frame.isValid()) << "bad frame " << count;
        count++;
    }
    EXPECT_GT(count, 0);
}

TEST(FileVideoSourceTest, FrameNumbersCountUpFromZero) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    long long expected = 0;
    while (source.readFrame(frame)) {
        EXPECT_EQ(frame.frameNumber, expected);
        expected++;
    }
}

TEST(FileVideoSourceTest, TimestampsIncreaseInMilliseconds) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    long long previous = -1;
    long long last = 0;
    while (source.readFrame(frame)) {
        EXPECT_GT(frame.timestamps, previous);
        previous = frame.timestamps;
        last = frame.timestamps;
    }
    // 10 fps: the last (10th) frame is at 900 ms. Allow a little rounding.
    EXPECT_NEAR((double)last, 900.0, 5.0);
}

TEST(FileVideoSourceTest, ReadFrameKeepsReturningFalseAtEnd) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    while (source.readFrame(frame)) {
    }
    EXPECT_FALSE(source.readFrame(frame));
    EXPECT_FALSE(source.readFrame(frame));
}

TEST(FileVideoSourceTest, ReusingSameFrameObjectWorks) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));

    VideoFrame frame;
    frame.data.resize(5);   // wrong old content must be replaced
    ASSERT_TRUE(source.readFrame(frame));
    EXPECT_TRUE(frame.isValid());
}

// ---------- close() / reopen ----------

TEST(FileVideoSourceTest, CloseWithoutOpenIsSafe) {
    FileVideoSource source;
    source.close();
    SUCCEED();
}

TEST(FileVideoSourceTest, CloseTwiceIsSafe) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    source.close();
    source.close();
    SUCCEED();
}

TEST(FileVideoSourceTest, ReadFrameAfterCloseFails) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    source.close();

    VideoFrame frame;
    EXPECT_FALSE(source.readFrame(frame));
}

TEST(FileVideoSourceTest, CanReopenSameFileAfterClose) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    VideoFrame frame;
    ASSERT_TRUE(source.readFrame(frame));
    source.close();

    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    ASSERT_TRUE(source.readFrame(frame));
    EXPECT_EQ(frame.frameNumber, 0);   // counter starts again
}

TEST(FileVideoSourceTest, OpenTwiceWithoutCloseRestartsFromFirstFrame) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    VideoFrame frame;
    ASSERT_TRUE(source.readFrame(frame));
    ASSERT_TRUE(source.readFrame(frame));

    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    ASSERT_TRUE(source.readFrame(frame));
    EXPECT_EQ(frame.frameNumber, 0);
}

TEST(FileVideoSourceTest, FailedOpenAfterGoodOpenClosesOldVideo) {
    FileVideoSource source;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    ASSERT_FALSE(source.open(dataFile("does_not_exist.mp4")));

    VideoFrame frame;
    EXPECT_FALSE(source.readFrame(frame));
}

TEST(FileVideoSourceTest, ReadAllFramesTwiceGivesSameCount) {
    FileVideoSource source;
    VideoFrame frame;

    int first = 0;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    while (source.readFrame(frame)) first++;

    int second = 0;
    ASSERT_TRUE(source.open(dataFile("sample.mp4")));
    while (source.readFrame(frame)) second++;

    EXPECT_EQ(first, 10);
    EXPECT_EQ(second, first);
}

// ---------- polymorphism ----------

TEST(FileVideoSourceTest, CanBeUsedThroughInterfacePointer) {
    FileVideoSource concrete;
    IVideoSource* source = &concrete;

    ASSERT_TRUE(source->open(dataFile("sample.mp4")));
    VideoFrame frame;
    EXPECT_TRUE(source->readFrame(frame));
    source->close();
}

TEST(FileVideoSourceTest, DestroyWhileOpenDoesNotCrash) {
    FileVideoSource* source = new FileVideoSource();
    ASSERT_TRUE(source->open(dataFile("sample.mp4")));
    VideoFrame frame;
    ASSERT_TRUE(source->readFrame(frame));
    delete source;   // destructor must free all FFmpeg objects
    SUCCEED();
}
