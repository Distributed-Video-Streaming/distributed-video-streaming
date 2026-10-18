# Stand-alone test project. It does NOT change the main CMakeLists.txt.
#
#   cmake -S tests -B build-tests
#   cmake --build build-tests --config Debug
#   ctest --test-dir build-tests -C Debug --output-on-failure
#
# The tests compile the project's own source files directly.

cmake_minimum_required(VERSION 3.14)
project(VideoStreamingTests LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# removes a harmless warning about timestamps of the downloaded GoogleTest
if(POLICY CMP0135)
    cmake_policy(SET CMP0135 NEW)
endif()

get_filename_component(PROJECT_ROOT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/.." ABSOLUTE)

# ---------- code under test ----------
add_library(code_under_test STATIC
    ${PROJECT_ROOT_DIR}/source/src/video_frame.cpp
    ${PROJECT_ROOT_DIR}/source/src/file_video_source.cpp
)
target_include_directories(code_under_test PUBLIC ${PROJECT_ROOT_DIR}/source/include)

# ---------- FFmpeg (same way as the main CMakeLists.txt) ----------
if(WIN32)
    set(FFMPEG_DIR "${PROJECT_ROOT_DIR}/ffmpeg" CACHE PATH "Path to the FFmpeg folder")

    if(NOT EXISTS "${FFMPEG_DIR}/include/libavformat/avformat.h")
        message(FATAL_ERROR "FFmpeg not found in ${FFMPEG_DIR}")
    endif()

    target_include_directories(code_under_test PUBLIC ${FFMPEG_DIR}/include)
    target_link_directories(code_under_test PUBLIC ${FFMPEG_DIR}/lib)
    target_link_libraries(code_under_test PUBLIC avformat avcodec avutil swscale)
else()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(FFMPEG REQUIRED IMPORTED_TARGET
        libavformat libavcodec libavutil libswscale)
    target_link_libraries(code_under_test PUBLIC PkgConfig::FFMPEG)
endif()

# ---------- GoogleTest ----------
# Use an installed GoogleTest if there is one, otherwise download it.
find_package(GTest QUIET)
if(NOT GTest_FOUND)
    include(FetchContent)
    FetchContent_Declare(googletest
        URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.zip)
    # on Windows: use the same runtime library as our code
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)
endif()

enable_testing()

add_executable(unit_tests
    test_video_frame.cpp
    test_video_source.cpp
    test_file_video_source.cpp
    test_repo_files.cpp
)

target_link_libraries(unit_tests PRIVATE code_under_test GTest::gtest_main)

target_compile_definitions(unit_tests PRIVATE
    TEST_DATA_DIR="${CMAKE_CURRENT_SOURCE_DIR}/data"
    PROJECT_ROOT="${PROJECT_ROOT_DIR}"
)

# FFmpeg dlls must be next to the test exe on Windows.
# Turn this OFF (-DCOPY_FFMPEG_DLLS=OFF) if FFmpeg comes from MSYS2 and
# C:\msys64\ucrt64\bin is already in PATH.
option(COPY_FFMPEG_DLLS "Copy FFmpeg dlls next to unit_tests.exe (Windows)" ON)
if(WIN32 AND COPY_FFMPEG_DLLS)
    add_custom_command(TARGET unit_tests POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${FFMPEG_DIR}/bin $<TARGET_FILE_DIR:unit_tests>)
endif()

include(GoogleTest)
# On Windows the first start of a new exe can be slow (antivirus scan), so
# wait longer than the default 5 seconds, and (CMake 3.18+) find the tests
# when ctest runs instead of right after the build.
if(CMAKE_VERSION VERSION_GREATER_EQUAL 3.18)
    gtest_discover_tests(unit_tests DISCOVERY_TIMEOUT 120 DISCOVERY_MODE PRE_TEST)
else()
    gtest_discover_tests(unit_tests DISCOVERY_TIMEOUT 120)
endif()
