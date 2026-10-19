cmake_minimum_required(VERSION 3.10)
project(MyProject LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(MyProject
    source/src/main.cpp
    source/src/video_frame.cpp
    source/src/file_video_source.cpp
)

# header files
target_include_directories(MyProject PRIVATE ${CMAKE_SOURCE_DIR}/source/include)

if(WIN32)
    # ffmpeg directory 
    set(FFMPEG_DIR "${CMAKE_SOURCE_DIR}/ffmpeg" CACHE PATH "Path to the FFmpeg folder")

    if(NOT EXISTS "${FFMPEG_DIR}/include/libavformat/avformat.h")
        message(FATAL_ERROR "FFmpeg not found in ${FFMPEG_DIR}")
    endif()

    target_include_directories(MyProject PRIVATE ${FFMPEG_DIR}/include)
    target_link_directories(MyProject PRIVATE ${FFMPEG_DIR}/lib)
    target_link_libraries(MyProject PRIVATE avformat avcodec avutil swscale)

    add_custom_command(TARGET MyProject POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${FFMPEG_DIR}/bin $<TARGET_FILE_DIR:MyProject>)
else()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(FFMPEG REQUIRED IMPORTED_TARGET
        libavformat libavcodec libavutil libswscale)
    target_link_libraries(MyProject PRIVATE PkgConfig::FFMPEG)
endif()