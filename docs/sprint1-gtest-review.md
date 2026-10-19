# distributed-video-streaming: Review and GoogleTest Report (Sprint 1)

**Oct 18, 2026 · @meray emil**

## Summary

All 147 GoogleTest cases pass on Linux and on Windows (MSYS2 UCRT64), and the source code in `source/` produced no failing test. The review of `.gitignore`, `CMakeLists.txt` and `README.md` found 7 gaps, kept as disabled "known gap" tests so the normal run stays green.

- **Scope:** `.gitignore`, `CMakeLists.txt`, `README.md` and `source/` (VideoFrame, IVideoSource, FileVideoSource, main.cpp) on branch `feature/sprint1-initial-setup`.
- **Project files untouched:** the tests live in a new `tests/` folder with its own `CMakeLists.txt`; no existing file was edited.
- **Result:** 147 tests in 14 suites passed, 0 failed, 7 disabled (the known gaps).
- **Main findings:** `.gitignore` lacks `ffmpeg/` and `.vscode/`; `README.md` holds only a title; the root `CMakeLists.txt` has no test hook; `FileVideoSource` can be copied, which would free the same FFmpeg objects twice.

## How to run the tests

The tests are a stand-alone CMake project in `tests/`, so the team's `CMakeLists.txt` is not changed. It compiles the project's own `source/src` files and links FFmpeg the same way the main project does.

### Files added

| File | Purpose |
|------|---------|
| `tests/CMakeLists.txt` | Builds `unit_tests`, finds or downloads GoogleTest, registers tests with CTest |
| `tests/test_video_frame.cpp` | VideoFrame struct |
| `tests/test_video_source.cpp` | IVideoSource interface, using a fake source |
| `tests/test_file_video_source.cpp` | FileVideoSource, using real media files |
| `tests/test_repo_files.cpp` | `.gitignore`, `CMakeLists.txt`, `README.md`, layout of `source/` |
| `tests/data/` | `sample.mp4` (320x240, 10 fps, 10 frames), `audio_only.wav`, `not_a_video.mp4` (text), `empty.mp4` |

### Windows (MSYS2 UCRT64 with GCC and Ninja)

1. Install FFmpeg in the MSYS2 UCRT64 shell:  
   `pacman -S mingw-w64-ucrt-x86_64-ffmpeg`
2. In PowerShell, from the project folder:

```powershell
$env:PATH = "C:\msys64\ucrt64\bin;" + $env:PATH
cmake -S tests -B build-tests -DFFMPEG_DIR=C:/msys64/ucrt64 -DCOPY_FFMPEG_DLLS=OFF
cmake --build build-tests
ctest --test-dir build-tests --output-on-failure
```

With a downloaded FFmpeg folder (`include`, `lib`, `bin`), pass its path in `-DFFMPEG_DIR` and drop `-DCOPY_FFMPEG_DLLS=OFF`. The `build-tests/` folder is already ignored by `.gitignore` (`build-*/`).

### Linux

Install the FFmpeg development packages and run:

```bash
cmake -S tests -B build-tests
cmake --build build-tests
ctest --test-dir build-tests --output-on-failure
```

**Known-gap tests** (disabled by default):

```bash
./build-tests/unit_tests --gtest_also_run_disabled_tests
```

## Review findings

Nothing blocks the build, and the code behaves as designed in every case the tests cover. The findings below are gaps and risks, sorted by file. "Test" shows which finding is backed by a test that fails on purpose (disabled by default).

| ID | Where | Finding | Severity | Suggested fix | Test |
|----|-------|---------|----------|---------------|------|
| G1 | `.gitignore` | No `ffmpeg/` rule, but `CMakeLists.txt` expects the FFmpeg folder inside the project on Windows. Headers and other files from it would show up in `git status`. | Medium | Add `ffmpeg/` | `KnownGap_FFmpegFolderIsNotIgnored` |
| G2 | `.gitignore` | No `.vscode/` rule (editor settings). | Low | Add `.vscode/` | `KnownGap_VSCodeFolderIsNotIgnored` |
| C1 | `CMakeLists.txt` | `cmake_minimum_required(VERSION 3.10)`, but the Windows branch uses `target_link_directories`, which needs CMake 3.13. | Medium | Raise the minimum to 3.13 | none |
| C2 | `CMakeLists.txt` | No `enable_testing()` or test folder, so tests cannot run from the root build. | Low | Add `enable_testing()` and `add_subdirectory(tests)` | `KnownGap_RootCMakeListsDoesNotRunTests` |
| C3 | `CMakeLists.txt` | The three source files are compiled straight into `MyProject`, so a test target cannot reuse them. The project name `MyProject` does not match the repo. | Low | Put them in a static library used by the app and the tests | none |
| C4 | `CMakeLists.txt` | On Windows the whole `ffmpeg/bin` folder is copied next to the exe. With FFmpeg from MSYS2 that folder holds hundreds of files. | Low | Copy only the FFmpeg DLLs, or make it optional | none |
| R1 | `README.md` | Only the title line. No description, requirements, build steps or test steps. | Medium | Add those four sections | `KnownGap_HasMoreThanJustATitle`, `HasBuildSection`, `HasTestingSection`, `MentionsRequirements` |
| S1 | `FileVideoSource` | The class holds raw FFmpeg pointers and can be copied. A copy would free the same objects twice in two destructors. | Medium | `FileVideoSource(const FileVideoSource&) = delete;` and the same for assignment | none (a test would crash) |
| S2 | `main.cpp` | Video path `../test.mp4` is hard-coded and relative. If open fails, the code still runs the read loop and prints "Frames read: 0", and `main` always returns 0. | Low | Take the path from `argv`, return 1 on failure | none |
| S3 | `video_source.h` | Methods are not `const` (`errorMessage`), `open` takes `std::string` by value, derived classes do not use `override`. | Low | `const std::string&`, `const`, `override` | none |
| S4 | `video_frame.h` | Uses `size_t` without `#include <cstddef>`. The field `timestamps` holds one value in milliseconds; the name and header do not say so. | Low | Add the include; rename or comment the field | none |
| S5 | `file_video_source.h` | Includes the FFmpeg headers, so every file that includes it needs FFmpeg on its include path. | Low | Forward-declare the FFmpeg types and include them only in the `.cpp` | none |

**Verified as correct (tests pass):** every `.cpp` is listed in `CMakeLists.txt`; no `.gitignore` rule hides `source`, `tests`, `README.md` or `CMakeLists.txt`; `.gitignore` rules for objects, binaries, CMake output and `build/` work when asked to `git check-ignore`; `VideoFrame` size and validity logic including large sizes; `FileVideoSource` opens valid video, rejects missing, empty, text and audio-only files with clear messages, reads exactly 10 frames from the sample, numbers frames from 0, gives increasing millisecond timestamps, and can be closed and reopened safely.

## Test cases

The suite has **154 cases**: 147 run by default and 7 disabled known-gap cases. Each case checks one behaviour and names its expected result.

| Suite | Target | Run | Disabled |
|-------|--------|-----|----------|
| VideoFrameTest | VideoFrame | 23 | 0 |
| VideoSourceInterfaceTest | IVideoSource | 4 | 0 |
| FileVideoSourceTest | FileVideoSource | 30 | 0 |
| GitignoreTest and rule suites | `.gitignore` | 68 | 2 |
| CMakeListsTest, TestsFolderTest | `CMakeLists.txt`, `tests/CMakeLists.txt` | 15 | 1 |
| ReadmeTest | `README.md` | 2 | 4 |
| SourceLayoutTest | `source/` folder | 5 | 0 |
| **Total** |  | **147** | **7** |

### VideoFrame (`test_video_frame.cpp`)

| ID | Test | Action | Expected |
|----|------|--------|----------|
| VF-01 | DefaultConstructedHasZeroValues | New frame | Width, height, frame number, timestamp are 0; data empty |
| VF-02 | DefaultConstructedIsNotValid | `isValid()` on new frame | false |
| VF-03 | ExpectedSizeIsWidthTimesHeightTimesThree | 640x480 | 921,600 bytes |
| VF-04 | ExpectedSizeOnePixel | 1x1 | 3 |
| VF-05 | ExpectedSizeZeroWidth | 0x480 | 0 |
| VF-06 | ExpectedSizeZeroHeight | 640x0 | 0 |
| VF-07 | ExpectedSizeNegativeWidth | -5x10 | 0 |
| VF-08 | ExpectedSizeNegativeHeight | 10x-5 | 0 |
| VF-09 | ExpectedSizeBothNegative | -1x-1 | 0 |
| VF-10 | ExpectedSizeFullHD | 1920x1080 | 6,220,800 |
| VF-11 | ExpectedSizeDoesNotOverflowInt | 40000x40000 | 4,800,000,000 (skipped on 32-bit builds) |
| VF-12 | ValidWhenDataSizeMatches | 4x2 with 24 bytes | true |
| VF-13 | NotValidWhenDataTooSmall | 4x2 with 23 bytes | false |
| VF-14 | NotValidWhenDataTooBig | 4x2 with 25 bytes | false |
| VF-15 | NotValidWhenDataEmptyButSizeSet | 4x2, no data | false |
| VF-16 | NotValidWhenSizeZeroEvenIfDataExists | 0x0 with 10 bytes | false |
| VF-17 | NotValidWhenWidthNegative | -4x2 with 24 bytes | false |
| VF-18 | IsValidAfterChangingResolution | Valid 2x2, widen to 4, then resize data | true, false, true |
| VF-19 | ClearResetsEverything | `clear()` on a filled frame | All fields 0, data empty, not valid |
| VF-20 | ClearOnEmptyFrameIsSafe | `clear()` on new frame | No crash, still empty |
| VF-21 | ClearCanBeCalledTwice | `clear()` twice | No crash, not valid |
| VF-22 | FrameCanBeReusedAfterClear | Clear, then set 1x1 with 3 bytes | true |
| VF-23 | CopyIsIndependentFromOriginal | Copy a frame, change the copy | Original unchanged |

### IVideoSource (`test_video_source.cpp`, fake source)

| ID | Test | Action | Expected |
|----|------|--------|----------|
| IF-01 | WorksThroughBasePointer | Open and read through `IVideoSource*` | 3 valid frames numbered 0 to 2 |
| IF-02 | OpenFailureGivesErrorMessage | Open with empty path | false, message not empty |
| IF-03 | NoFramesAfterClose | Read after `close()` | false |
| IF-04 | DestructorIsVirtual | Delete derived object through base pointer | Derived destructor runs once |

### FileVideoSource (`test_file_video_source.cpp`, real media files)

| ID | Test | Action | Expected |
|----|------|--------|----------|
| FV-01 | OpenMissingFileFails | Open a path that does not exist | false |
| FV-02 | OpenMissingFileSetsErrorWithPath | Same | Message has "Cannot open file" and the file name |
| FV-03 | OpenEmptyPathFails | Open `""` | false, message not empty |
| FV-04 | OpenTextFileWithMp4NameFails | Text file named `.mp4` | false, message not empty |
| FV-05 | OpenEmptyFileFails | 0-byte `.mp4` | false, message not empty |
| FV-06 | OpenAudioOnlyFileFailsWithNoVideoMessage | Audio-only `.wav` | false, "No video found in this file" |
| FV-07 | OpenValidFileSucceeds | `sample.mp4` | true |
| FV-08 | ErrorMessageEmptyAfterSuccessfulOpen | After a good open | Message empty |
| FV-09 | ErrorMessageEmptyOnNewObject | New object | Message empty |
| FV-10 | ErrorIsClearedByNextSuccessfulOpen | Failed open, then good open | Message cleared |
| FV-11 | ReadFrameBeforeOpenFails | Read on new object | false, "Video is not open" |
| FV-12 | ReadFrameAfterFailedOpenFails | Read after failed open | false |
| FV-13 | FirstFrameHasCorrectSize | First frame | 320x240, 230,400 bytes, valid |
| FV-14 | FirstFrameNumberAndTimestampAreZero | First frame | Number 0, time 0 ms |
| FV-15 | FrameContainsRealPixels | First frame | At least one byte is not 0 |
| FV-16 | ReadsAllTenFramesThenStops | Read until false | 10 frames |
| FV-17 | EveryFrameIsValid | Check each frame | All valid |
| FV-18 | FrameNumbersCountUpFromZero | Check frame numbers | 0, 1, 2, ... |
| FV-19 | TimestampsIncreaseInMilliseconds | Check times | Strictly increasing, last about 900 ms |
| FV-20 | ReadFrameKeepsReturningFalseAtEnd | Read twice after the end | false both times |
| FV-21 | ReusingSameFrameObjectWorks | Frame object with wrong old data | Replaced, valid |
| FV-22 | CloseWithoutOpenIsSafe | `close()` on new object | No crash |
| FV-23 | CloseTwiceIsSafe | `close()` twice | No crash |
| FV-24 | ReadFrameAfterCloseFails | Read after close | false |
| FV-25 | CanReopenSameFileAfterClose | Close, open again, read | Frame number back to 0 |
| FV-26 | OpenTwiceWithoutCloseRestartsFromFirstFrame | Open twice in a row | Frame number back to 0 |
| FV-27 | FailedOpenAfterGoodOpenClosesOldVideo | Good open, then failed open, then read | false |
| FV-28 | ReadAllFramesTwiceGivesSameCount | Read the file two times | 10 and 10 |
| FV-29 | CanBeUsedThroughInterfacePointer | Use as `IVideoSource*` | Open, read, close work |
| FV-30 | DestroyWhileOpenDoesNotCrash | Delete an open object | No crash |

### .gitignore (`test_repo_files.cpp`)

| ID | Test | Action | Expected |
|----|------|--------|----------|
| GI-01 | FileIsNotEmpty | Read the file | At least one rule |
| GI-02 | HasNoDuplicateRules | Compare all rules | No rule twice |
| GI-03 | HasNoTrailingSpacesInRules | Check line ends | No rule ends with a space |
| GI-04 | BuildOutputs (10 cases) | Look for `*.o`, `*.obj`, `*.exe`, `*.dll`, `*.so`, `*.a`, `*.lib`, `*.pdb`, `*.ilk`, `build/` | Each rule present |
| GI-05 | CMakeGenerated (5 cases) | Look for `CMakeCache.txt`, `CMakeFiles/`, `cmake_install.cmake`, `Makefile`, `compile_commands.json` | Each rule present |
| GI-06 | TemporaryFiles (6 cases) | Look for `*.log`, `*.tmp`, `*.bak`, `*.swp`, `Testing/`, `.cache/` | Each rule present |
| GI-07 | Dangerous (12 cases) | Look for `*`, `*.cpp`, `*.h`, `*.txt`, `*.md`, `*.mp4`, `*.wav`, `source/`, `tests/`, `CMakeLists.txt`, `README.md`, `.gitignore` | None present |
| GI-08 | Ignored (19 cases) | `git check-ignore` on generated paths such as `build/MyProject.exe`, `main.o`, `app.exe`, `debug.log`, `Makefile` | Git says ignored |
| GI-09 | NotIgnored (13 cases) | `git check-ignore` on `source/` files, `CMakeLists.txt`, `README.md`, `.gitignore`, `tests/` files and sample media | Git says not ignored |
| GI-10 | DISABLED KnownGap_FFmpegFolderIsNotIgnored | Look for `ffmpeg/` | Fails today (finding G1) |
| GI-11 | DISABLED KnownGap_VSCodeFolderIsNotIgnored | Look for `.vscode/` | Fails today (finding G2) |

> GI-08 and GI-09 are skipped, not failed, when git is missing or the folder is not a git repository.

### CMakeLists.txt (`test_repo_files.cpp`)

| ID | Test | Expected |
|----|------|----------|
| CM-01 | HasMinimumVersionAndProject | `cmake_minimum_required` and `project(` present |
| CM-02 | UsesCpp17 | `CMAKE_CXX_STANDARD 17` and `..._REQUIRED ON` |
| CM-03 | AllSourceFilesAreListed | Every `.cpp` in `source/src` appears in the file |
| CM-04 | EveryListedSourceFileExists | Every `source/src/*.cpp` in the file exists on disk |
| CM-05 | IncludeDirectoryIsSetAndExists | `source/include` is used and exists |
| CM-06 | LinksAllFourFFmpegLibrariesOnWindows | `avformat`, `avcodec`, `avutil`, `swscale` present |
| CM-07 | LinksAllFourFFmpegLibrariesWithPkgConfig | `libavformat`, `libavcodec`, `libavutil`, `libswscale` present |
| CM-08 | HasWindowsAndNonWindowsBranch | `if(WIN32)` and `else()` present |
| CM-09 | StopsWithClearErrorWhenFFmpegIsMissingOnWindows | `FATAL_ERROR` and `FFMPEG_DIR` present |
| CM-10 | CopiesFFmpegDllsOnWindows | `copy_directory` present |
| CM-11 | HasNoHardCodedAbsolutePaths | No `C:\`, `/home/`, `/Users/` |
| CM-12 | ParenthesesAreBalanced | Every `(` has a `)` |
| CM-13 | DefinesTheMainExecutable | `add_executable(MyProject` with `main.cpp` |
| CM-14 | TestsCMakeListsExistsAndUsesGoogleTest | `tests/CMakeLists.txt` uses `GTest::gtest_main` and `gtest_discover_tests` |
| CM-15 | AllTestFilesAreListedInTestsCMakeLists | Every `tests/*.cpp` is built |
| CM-16 | DISABLED KnownGap_RootCMakeListsDoesNotRunTests | Looks for `enable_testing()`; fails today (finding C2) |

### README.md (`test_repo_files.cpp`)

| ID | Test | Expected |
|----|------|----------|
| RM-01 | IsNotEmpty | File has content |
| RM-02 | FirstHeadingIsProjectName | First heading is `# distributed-video-streaming` |
| RM-03 | DISABLED KnownGap_HasMoreThanJustATitle | More than 3 lines; fails today (finding R1) |
| RM-04 | DISABLED KnownGap_HasBuildSection | A heading with "build"; fails today |
| RM-05 | DISABLED KnownGap_HasTestingSection | A heading with "test"; fails today |
| RM-06 | DISABLED KnownGap_MentionsRequirements | Mentions CMake, FFmpeg, GoogleTest; fails today |

### source/ layout (`test_repo_files.cpp`)

| ID | Test | Expected |
|----|------|----------|
| SL-01 | ExpectedFilesExist | The 3 headers and 3 `.cpp` files exist |
| SL-02 | EveryHeaderHasPragmaOnce | Each header has `#pragma once` |
| SL-03 | NoHeaderUsesUsingNamespace | No `using namespace` in headers |
| SL-04 | EveryCppIncludesItsOwnHeader | `video_frame.cpp` and `file_video_source.cpp` include their headers |
| SL-05 | EveryHeaderHasACppFileExceptInterfaces | Each header has a `.cpp`, except `video_source.h` |

## Results

147 of 147 default tests passed on both platforms. Run with the disabled cases switched on (Linux only), the 7 known-gap tests fail, which is the intended proof of findings G1, G2, C2 and R1.

| Platform | Toolchain | Command | Result |
|----------|-----------|---------|--------|
| Linux (Ubuntu 24.04) | GCC 13.3.0, CMake 3.28.3, FFmpeg 6.1.1, GoogleTest 1.15.2 | `ctest` | 100% passed, 147 of 147, 0.8 s |
| Linux | Same | `unit_tests --gtest_also_run_disabled_tests` | 147 passed, 7 failed (the known gaps) |
| Windows | MSYS2 UCRT64, GCC 16.2.0, Ninja, FFmpeg from the MSYS2 package | `unit_tests.exe --gtest_brief=1` | Direct run: 147 tests from 14 suites passed in 11.5 s. CTest run: 100% passed, 147 of 147, 29.5 s. 7 disabled. |

**Notes on the runs:**

- On Windows two FFmpeg lines appear ("moov atom not found"). They come from FV-04 and FV-05, which open a text file and an empty file on purpose, and are not errors.
- On Windows the first build stopped because CMake runs `unit_tests.exe` once to list the tests and waits only 5 seconds; the first start of a new exe was slower than that. `tests/CMakeLists.txt` now waits up to 120 seconds, and the exe itself ran correctly.
- The Windows run took 11.5 s against 0.2 s on Linux; the cause was not investigated.
- Not run yet: the disabled known-gap cases on Windows.
- FV-19 and FV-16 depend on `tests/data/sample.mp4` (10 frames at 10 fps, MPEG-4 video); if that file is replaced, update the expected counts.

## Recommendations

Fix **S1**, **C1** and **G1** first; each is a one-line change. Doing G1, G2, C2 and R1 turns all 7 disabled tests into passing tests, so the `DISABLED_` prefix can then be removed.

1. **S1:** delete the copy constructor and copy assignment of `FileVideoSource`.
2. **C1:** raise `cmake_minimum_required` to 3.13.
3. **G1, G2:** add `ffmpeg/` and `.vscode/` to `.gitignore`.
4. **R1:** write the README with a description, requirements, build steps and test steps.
5. **C2, C3:** add `enable_testing()` and `add_subdirectory(tests)` to the root file, and move the shared sources into a library so the tests link it instead of recompiling the sources.
6. **S2 to S5:** take the video path from the command line, add `const` and `override`, include `<cstddef>`, and keep FFmpeg headers out of public headers.
7. After fixes 1 to 5, run the 7 disabled tests on Windows and confirm they pass, then remove the `DISABLED_` prefix.

**Tests to add when the code grows:** decoding a video with a different pixel format and an odd width, a video with an audio stream, and a file that ends in the middle of a frame.
