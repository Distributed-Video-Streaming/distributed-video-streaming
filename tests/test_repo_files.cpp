// Tests for the project files themselves:
//   .gitignore, CMakeLists.txt, README.md and the layout of source/
// PROJECT_ROOT is the repo folder (it is set in tests/CMakeLists.txt).

#include <gtest/gtest.h>

#include <algorithm>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <regex>
#include <set>
#include <sstream>
#include <string>
#include <vector>

#ifndef _WIN32
#include <sys/wait.h>
#endif

namespace fs = std::filesystem;

static fs::path projectRoot() { return fs::path(PROJECT_ROOT); }

static std::string readFile(const fs::path& path) {
    std::ifstream in(path, std::ios::binary);
    std::stringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
}

static std::vector<std::string> readLines(const fs::path& path) {
    std::vector<std::string> lines;
    std::ifstream in(path);
    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();   // Windows line ending
        }
        lines.push_back(line);
    }
    return lines;
}

static std::string toLower(std::string text) {
    std::transform(text.begin(), text.end(), text.begin(),
                   [](unsigned char c) { return (char)std::tolower(c); });
    return text;
}

static bool contains(const std::string& text, const std::string& part) {
    return text.find(part) != std::string::npos;
}

// ======================================================================
//  .gitignore
// ======================================================================

class GitignoreTest : public ::testing::Test {
protected:
    void SetUp() override {
        path = projectRoot() / ".gitignore";
        ASSERT_TRUE(fs::exists(path)) << ".gitignore is missing";
        lines = readLines(path);
        for (const std::string& line : lines) {
            if (!line.empty() && line[0] != '#') {
                rules.insert(line);
            }
        }
    }

    bool hasRule(const std::string& rule) const { return rules.count(rule) > 0; }

    // Asks git itself: 0 = ignored, 1 = not ignored, anything else = error
    int gitCheckIgnore(const std::string& file) const {
        std::string command = "git -C \"" + projectRoot().string() +
                              "\" check-ignore -q -- \"" + file + "\"";
        return runCommand(command);
    }

    static int runCommand(const std::string& command) {
#ifdef _WIN32
        std::string full = command + " >nul 2>&1";
        return std::system(full.c_str());
#else
        std::string full = command + " >/dev/null 2>&1";
        int status = std::system(full.c_str());
        return WIFEXITED(status) ? WEXITSTATUS(status) : -1;
#endif
    }

    bool gitIsAvailable() const {
        std::string command = "git -C \"" + projectRoot().string() +
                              "\" rev-parse --is-inside-work-tree";
        return runCommand(command) == 0;
    }

    fs::path path;
    std::vector<std::string> lines;
    std::set<std::string> rules;
};

TEST_F(GitignoreTest, FileIsNotEmpty) {
    EXPECT_FALSE(rules.empty());
}

TEST_F(GitignoreTest, HasNoDuplicateRules) {
    std::set<std::string> seen;
    for (const std::string& line : lines) {
        if (line.empty() || line[0] == '#') continue;
        EXPECT_TRUE(seen.insert(line).second) << "duplicate rule: " << line;
    }
}

TEST_F(GitignoreTest, HasNoTrailingSpacesInRules) {
    // a trailing space becomes part of the pattern and breaks the rule
    for (const std::string& line : lines) {
        if (line.empty() || line[0] == '#') continue;
        EXPECT_NE(line.back(), ' ') << "rule ends with a space: '" << line << "'";
    }
}

class GitignoreRuleTest : public GitignoreTest,
                          public ::testing::WithParamInterface<std::string> {};

TEST_P(GitignoreRuleTest, RuleIsPresent) {
    EXPECT_TRUE(hasRule(GetParam())) << "missing rule: " << GetParam();
}

INSTANTIATE_TEST_SUITE_P(
    BuildOutputs, GitignoreRuleTest,
    ::testing::Values("*.o", "*.obj", "*.exe", "*.dll", "*.so", "*.a", "*.lib",
                      "*.pdb", "*.ilk", "build/"));

INSTANTIATE_TEST_SUITE_P(
    CMakeGenerated, GitignoreRuleTest,
    ::testing::Values("CMakeCache.txt", "CMakeFiles/", "cmake_install.cmake",
                      "Makefile", "compile_commands.json"));

INSTANTIATE_TEST_SUITE_P(
    TemporaryFiles, GitignoreRuleTest,
    ::testing::Values("*.log", "*.tmp", "*.bak", "*.swp", "Testing/", ".cache/"));

// Known gaps in the current .gitignore (see the review). They are DISABLED so the
// normal run stays green. Run them with --gtest_also_run_disabled_tests to see them.
TEST_F(GitignoreTest, DISABLED_KnownGap_FFmpegFolderIsNotIgnored) {
    // CMakeLists.txt expects the FFmpeg files in <project>/ffmpeg on Windows
    EXPECT_TRUE(hasRule("ffmpeg/"));
}

TEST_F(GitignoreTest, DISABLED_KnownGap_VSCodeFolderIsNotIgnored) {
    EXPECT_TRUE(hasRule(".vscode/"));
}

class GitignoreMustNotIgnoreTest : public GitignoreTest,
                                   public ::testing::WithParamInterface<std::string> {};

TEST_P(GitignoreMustNotIgnoreTest, DangerousRuleIsNotPresent) {
    EXPECT_FALSE(hasRule(GetParam()))
        << "this rule would hide real project files: " << GetParam();
}

INSTANTIATE_TEST_SUITE_P(
    Dangerous, GitignoreMustNotIgnoreTest,
    ::testing::Values("*", "*.cpp", "*.h", "*.txt", "*.md", "*.mp4", "*.wav",
                      "source/", "tests/", "CMakeLists.txt", "README.md",
                      ".gitignore"));

// ---- behaviour: ask git if a path is really ignored ----

class GitignoreBehaviourTest : public GitignoreTest,
                               public ::testing::WithParamInterface<std::string> {};

TEST_P(GitignoreBehaviourTest, GeneratedFileIsIgnored) {
    if (!gitIsAvailable()) GTEST_SKIP() << "git not found, or this is not a git folder";
    EXPECT_EQ(gitCheckIgnore(GetParam()), 0) << GetParam() << " should be ignored";
}

INSTANTIATE_TEST_SUITE_P(
    Ignored, GitignoreBehaviourTest,
    ::testing::Values("build/anything.txt", "build/MyProject.exe", "main.o",
                      "source/src/main.obj", "app.exe", "avcodec-60.dll", "libx.a",
                      "x.lib", "x.pdb", "CMakeCache.txt", "CMakeFiles/a.txt",
                      "cmake_install.cmake", "Makefile", "compile_commands.json",
                      "debug.log", "notes.tmp", "old.bak",
                      "Testing/Temporary/LastTest.log", ".cache/clangd/index"));

class GitignoreTrackedTest : public GitignoreTest,
                             public ::testing::WithParamInterface<std::string> {};

TEST_P(GitignoreTrackedTest, ProjectFileIsNotIgnored) {
    if (!gitIsAvailable()) GTEST_SKIP() << "git not found, or this is not a git folder";
    EXPECT_EQ(gitCheckIgnore(GetParam()), 1) << GetParam() << " must NOT be ignored";
}

INSTANTIATE_TEST_SUITE_P(
    NotIgnored, GitignoreTrackedTest,
    ::testing::Values("CMakeLists.txt", "README.md", ".gitignore",
                      "source/src/main.cpp", "source/src/video_frame.cpp",
                      "source/src/file_video_source.cpp",
                      "source/include/video_frame.h", "source/include/video_source.h",
                      "source/include/file_video_source.h",
                      "tests/CMakeLists.txt", "tests/test_video_frame.cpp",
                      "tests/data/sample.mp4", "tests/data/audio_only.wav"));

// ======================================================================
//  CMakeLists.txt
// ======================================================================

class CMakeListsTest : public ::testing::Test {
protected:
    void SetUp() override {
        path = projectRoot() / "CMakeLists.txt";
        ASSERT_TRUE(fs::exists(path)) << "CMakeLists.txt is missing";
        text = readFile(path);
    }
    fs::path path;
    std::string text;
};

TEST_F(CMakeListsTest, HasMinimumVersionAndProject) {
    EXPECT_TRUE(std::regex_search(text, std::regex(R"(cmake_minimum_required\s*\(\s*VERSION\s+\d+\.\d+)")));
    EXPECT_TRUE(std::regex_search(text, std::regex(R"(project\s*\()")));
}

TEST_F(CMakeListsTest, UsesCpp17) {
    EXPECT_TRUE(std::regex_search(text, std::regex(R"(CMAKE_CXX_STANDARD\s+17)")));
    EXPECT_TRUE(std::regex_search(text, std::regex(R"(CMAKE_CXX_STANDARD_REQUIRED\s+ON)")));
}

TEST_F(CMakeListsTest, AllSourceFilesAreListed) {
    // a .cpp file that exists but is not in CMakeLists would never be built
    fs::path srcDir = projectRoot() / "source" / "src";
    ASSERT_TRUE(fs::exists(srcDir));
    int found = 0;
    for (const auto& entry : fs::directory_iterator(srcDir)) {
        if (entry.path().extension() == ".cpp") {
            found++;
            std::string name = "source/src/" + entry.path().filename().string();
            EXPECT_TRUE(contains(text, name)) << name << " is not in CMakeLists.txt";
        }
    }
    EXPECT_GT(found, 0);
}

TEST_F(CMakeListsTest, EveryListedSourceFileExists) {
    std::regex listed(R"(source/src/[A-Za-z0-9_]+\.cpp)");
    auto begin = std::sregex_iterator(text.begin(), text.end(), listed);
    for (auto it = begin; it != std::sregex_iterator(); ++it) {
        EXPECT_TRUE(fs::exists(projectRoot() / it->str())) << it->str() << " does not exist";
    }
}

TEST_F(CMakeListsTest, IncludeDirectoryIsSetAndExists) {
    EXPECT_TRUE(contains(text, "source/include"));
    EXPECT_TRUE(fs::is_directory(projectRoot() / "source" / "include"));
}

TEST_F(CMakeListsTest, LinksAllFourFFmpegLibrariesOnWindows) {
    for (const char* lib : {"avformat", "avcodec", "avutil", "swscale"}) {
        EXPECT_TRUE(contains(text, lib)) << lib << " is not linked";
    }
}

TEST_F(CMakeListsTest, LinksAllFourFFmpegLibrariesWithPkgConfig) {
    for (const char* lib : {"libavformat", "libavcodec", "libavutil", "libswscale"}) {
        EXPECT_TRUE(contains(text, lib)) << lib << " is not in pkg_check_modules";
    }
}

TEST_F(CMakeListsTest, HasWindowsAndNonWindowsBranch) {
    EXPECT_TRUE(contains(text, "if(WIN32)"));
    EXPECT_TRUE(contains(text, "else()"));
}

TEST_F(CMakeListsTest, StopsWithClearErrorWhenFFmpegIsMissingOnWindows) {
    EXPECT_TRUE(contains(text, "FATAL_ERROR"));
    EXPECT_TRUE(contains(text, "FFMPEG_DIR"));
}

TEST_F(CMakeListsTest, CopiesFFmpegDllsOnWindows) {
    EXPECT_TRUE(contains(text, "copy_directory"));
}

TEST_F(CMakeListsTest, HasNoHardCodedAbsolutePaths) {
    EXPECT_FALSE(std::regex_search(text, std::regex(R"([A-Za-z]:\\)"))) << "found a Windows path";
    EXPECT_FALSE(contains(text, "/home/")) << "found a Linux home path";
    EXPECT_FALSE(contains(text, "/Users/")) << "found a Mac home path";
}

TEST_F(CMakeListsTest, ParenthesesAreBalanced) {
    int depth = 0;
    for (char c : text) {
        if (c == '(') depth++;
        if (c == ')') depth--;
        ASSERT_GE(depth, 0) << "a ')' has no matching '('";
    }
    EXPECT_EQ(depth, 0) << "a '(' is never closed";
}

TEST_F(CMakeListsTest, DefinesTheMainExecutable) {
    EXPECT_TRUE(contains(text, "add_executable(MyProject"));
    EXPECT_TRUE(contains(text, "source/src/main.cpp"));
}

TEST_F(CMakeListsTest, DISABLED_KnownGap_RootCMakeListsDoesNotRunTests) {
    // the root file has no enable_testing()/add_subdirectory(tests), so tests
    // are built from the tests folder on its own
    EXPECT_TRUE(contains(text, "enable_testing()"));
}

TEST(TestsFolderTest, TestsCMakeListsExistsAndUsesGoogleTest) {
    fs::path testsCmake = projectRoot() / "tests" / "CMakeLists.txt";
    ASSERT_TRUE(fs::exists(testsCmake));
    std::string testsText = readFile(testsCmake);
    EXPECT_TRUE(contains(testsText, "GTest::gtest_main"));
    EXPECT_TRUE(contains(testsText, "gtest_discover_tests"));
}

TEST(TestsFolderTest, AllTestFilesAreListedInTestsCMakeLists) {
    fs::path testsDir = projectRoot() / "tests";
    std::string testsText = readFile(testsDir / "CMakeLists.txt");
    for (const auto& entry : fs::directory_iterator(testsDir)) {
        if (entry.path().extension() == ".cpp") {
            EXPECT_TRUE(contains(testsText, entry.path().filename().string()))
                << entry.path().filename().string() << " is not built";
        }
    }
}

// ======================================================================
//  README.md
// ======================================================================

class ReadmeTest : public ::testing::Test {
protected:
    void SetUp() override {
        path = projectRoot() / "README.md";
        ASSERT_TRUE(fs::exists(path)) << "README.md is missing";
        text = readFile(path);
        lowered = toLower(text);
        for (const std::string& line : readLines(path)) {
            if (!line.empty() && line[0] == '#') headings.push_back(toLower(line));
        }
    }

    bool hasHeadingWith(const std::string& word) const {
        for (const std::string& h : headings) {
            if (contains(h, word)) return true;
        }
        return false;
    }

    fs::path path;
    std::string text;
    std::string lowered;
    std::vector<std::string> headings;
};

TEST_F(ReadmeTest, IsNotEmpty) {
    EXPECT_FALSE(text.empty());
}

TEST_F(ReadmeTest, FirstHeadingIsProjectName) {
    ASSERT_FALSE(headings.empty());
    EXPECT_EQ(headings[0], "# distributed-video-streaming");
}

TEST_F(ReadmeTest, DISABLED_KnownGap_HasMoreThanJustATitle) {
    EXPECT_GT(readLines(path).size(), 3u);
}

TEST_F(ReadmeTest, DISABLED_KnownGap_HasBuildSection) {
    EXPECT_TRUE(hasHeadingWith("build"));
}

TEST_F(ReadmeTest, DISABLED_KnownGap_HasTestingSection) {
    EXPECT_TRUE(hasHeadingWith("test"));
}

TEST_F(ReadmeTest, DISABLED_KnownGap_MentionsRequirements) {
    EXPECT_TRUE(contains(lowered, "cmake"));
    EXPECT_TRUE(contains(lowered, "ffmpeg"));
    EXPECT_TRUE(contains(lowered, "googletest"));
}

// ======================================================================
//  source/ folder layout
// ======================================================================

TEST(SourceLayoutTest, ExpectedFilesExist) {
    for (const char* file : {"source/include/video_frame.h", "source/include/video_source.h",
                             "source/include/file_video_source.h", "source/src/video_frame.cpp",
                             "source/src/file_video_source.cpp", "source/src/main.cpp"}) {
        EXPECT_TRUE(fs::exists(projectRoot() / file)) << file << " is missing";
    }
}

TEST(SourceLayoutTest, EveryHeaderHasPragmaOnce) {
    int found = 0;
    for (const auto& entry : fs::directory_iterator(projectRoot() / "source" / "include")) {
        if (entry.path().extension() == ".h") {
            found++;
            EXPECT_TRUE(contains(readFile(entry.path()), "#pragma once"))
                << entry.path().filename().string() << " has no include guard";
        }
    }
    EXPECT_GT(found, 0);
}

TEST(SourceLayoutTest, NoHeaderUsesUsingNamespace) {
    for (const auto& entry : fs::directory_iterator(projectRoot() / "source" / "include")) {
        if (entry.path().extension() == ".h") {
            EXPECT_FALSE(contains(readFile(entry.path()), "using namespace"))
                << entry.path().filename().string() << " pollutes every file that includes it";
        }
    }
}

TEST(SourceLayoutTest, EveryCppIncludesItsOwnHeader) {
    for (const auto& entry : fs::directory_iterator(projectRoot() / "source" / "src")) {
        if (entry.path().extension() != ".cpp" || entry.path().stem() == "main") continue;
        std::string header = entry.path().stem().string() + ".h";
        EXPECT_TRUE(contains(readFile(entry.path()), "#include \"" + header + "\""))
            << entry.path().filename().string() << " does not include " << header;
    }
}

TEST(SourceLayoutTest, EveryHeaderHasACppFileExceptInterfaces) {
    // video_source.h is only an interface, so it has no .cpp
    for (const auto& entry : fs::directory_iterator(projectRoot() / "source" / "include")) {
        if (entry.path().extension() != ".h" || entry.path().stem() == "video_source") continue;
        fs::path cpp = projectRoot() / "source" / "src" / (entry.path().stem().string() + ".cpp");
        EXPECT_TRUE(fs::exists(cpp)) << entry.path().filename().string() << " has no .cpp";
    }
}
