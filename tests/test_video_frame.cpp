#include <gtest/gtest.h>
#include <limits>
#include "video_frame.h"

// ---------- default values ----------

TEST(VideoFrameTest, DefaultConstructedHasZeroValues) {
    VideoFrame f;
    EXPECT_EQ(f.width, 0);
    EXPECT_EQ(f.height, 0);
    EXPECT_EQ(f.frameNumber, 0);
    EXPECT_EQ(f.timestamps, 0);
    EXPECT_TRUE(f.data.empty());
}

TEST(VideoFrameTest, DefaultConstructedIsNotValid) {
    VideoFrame f;
    EXPECT_FALSE(f.isValid());
}

// ---------- expectedSize() ----------

TEST(VideoFrameTest, ExpectedSizeIsWidthTimesHeightTimesThree) {
    VideoFrame f;
    f.width = 640;
    f.height = 480;
    EXPECT_EQ(f.expectedSize(), 640u * 480u * 3u);
}

TEST(VideoFrameTest, ExpectedSizeOnePixel) {
    VideoFrame f;
    f.width = 1;
    f.height = 1;
    EXPECT_EQ(f.expectedSize(), 3u);
}

TEST(VideoFrameTest, ExpectedSizeZeroWidth) {
    VideoFrame f;
    f.width = 0;
    f.height = 480;
    EXPECT_EQ(f.expectedSize(), 0u);
}

TEST(VideoFrameTest, ExpectedSizeZeroHeight) {
    VideoFrame f;
    f.width = 640;
    f.height = 0;
    EXPECT_EQ(f.expectedSize(), 0u);
}

TEST(VideoFrameTest, ExpectedSizeNegativeWidth) {
    VideoFrame f;
    f.width = -5;
    f.height = 10;
    EXPECT_EQ(f.expectedSize(), 0u);
}

TEST(VideoFrameTest, ExpectedSizeNegativeHeight) {
    VideoFrame f;
    f.width = 10;
    f.height = -5;
    EXPECT_EQ(f.expectedSize(), 0u);
}

TEST(VideoFrameTest, ExpectedSizeBothNegative) {
    VideoFrame f;
    f.width = -1;
    f.height = -1;
    EXPECT_EQ(f.expectedSize(), 0u);
}

TEST(VideoFrameTest, ExpectedSizeFullHD) {
    VideoFrame f;
    f.width = 1920;
    f.height = 1080;
    EXPECT_EQ(f.expectedSize(), 6220800u);
}

TEST(VideoFrameTest, ExpectedSizeDoesNotOverflowInt) {
    // 40000 * 40000 * 3 is bigger than the max of a 32 bit int,
    // the code casts to size_t first so the result must still be right.
    if (sizeof(size_t) < 8) {
        GTEST_SKIP() << "needs a 64 bit build";
    }
    VideoFrame f;
    f.width = 40000;
    f.height = 40000;
    size_t expected = (size_t)40000 * 40000 * 3;
    EXPECT_EQ(f.expectedSize(), expected);
}

// ---------- isValid() ----------

TEST(VideoFrameTest, ValidWhenDataSizeMatches) {
    VideoFrame f;
    f.width = 4;
    f.height = 2;
    f.data.resize(4 * 2 * 3);
    EXPECT_TRUE(f.isValid());
}

TEST(VideoFrameTest, NotValidWhenDataTooSmall) {
    VideoFrame f;
    f.width = 4;
    f.height = 2;
    f.data.resize(4 * 2 * 3 - 1);
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, NotValidWhenDataTooBig) {
    VideoFrame f;
    f.width = 4;
    f.height = 2;
    f.data.resize(4 * 2 * 3 + 1);
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, NotValidWhenDataEmptyButSizeSet) {
    VideoFrame f;
    f.width = 4;
    f.height = 2;
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, NotValidWhenSizeZeroEvenIfDataExists) {
    VideoFrame f;
    f.width = 0;
    f.height = 0;
    f.data.resize(10);
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, NotValidWhenWidthNegative) {
    VideoFrame f;
    f.width = -4;
    f.height = 2;
    f.data.resize(24);
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, IsValidAfterChangingResolution) {
    VideoFrame f;
    f.width = 2;
    f.height = 2;
    f.data.resize(12);
    ASSERT_TRUE(f.isValid());

    f.width = 4;               // data is now the wrong size
    EXPECT_FALSE(f.isValid());

    f.data.resize(24);         // fixed again
    EXPECT_TRUE(f.isValid());
}

// ---------- clear() ----------

TEST(VideoFrameTest, ClearResetsEverything) {
    VideoFrame f;
    f.width = 320;
    f.height = 240;
    f.frameNumber = 7;
    f.timestamps = 1234;
    f.data.resize(320 * 240 * 3);

    f.clear();

    EXPECT_EQ(f.width, 0);
    EXPECT_EQ(f.height, 0);
    EXPECT_EQ(f.frameNumber, 0);
    EXPECT_EQ(f.timestamps, 0);
    EXPECT_TRUE(f.data.empty());
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, ClearOnEmptyFrameIsSafe) {
    VideoFrame f;
    f.clear();
    EXPECT_EQ(f.width, 0);
    EXPECT_TRUE(f.data.empty());
}

TEST(VideoFrameTest, ClearCanBeCalledTwice) {
    VideoFrame f;
    f.width = 2;
    f.height = 2;
    f.data.resize(12);
    f.clear();
    f.clear();
    EXPECT_FALSE(f.isValid());
}

TEST(VideoFrameTest, FrameCanBeReusedAfterClear) {
    VideoFrame f;
    f.width = 2;
    f.height = 2;
    f.data.resize(12);
    f.clear();

    f.width = 1;
    f.height = 1;
    f.data.resize(3);
    EXPECT_TRUE(f.isValid());
}

// ---------- copy ----------

TEST(VideoFrameTest, CopyIsIndependentFromOriginal) {
    VideoFrame a;
    a.width = 2;
    a.height = 1;
    a.frameNumber = 3;
    a.timestamps = 99;
    a.data = {1, 2, 3, 4, 5, 6};

    VideoFrame b = a;
    b.data[0] = 200;
    b.frameNumber = 4;

    EXPECT_EQ(a.data[0], 1);
    EXPECT_EQ(a.frameNumber, 3);
    EXPECT_EQ(b.data[0], 200);
    EXPECT_EQ(b.width, 2);
    EXPECT_EQ(b.timestamps, 99);
    EXPECT_TRUE(b.isValid());
}
