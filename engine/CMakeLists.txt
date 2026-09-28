cmake_minimum_required(VERSION 3.20)

project(PaperTradingEngine
    VERSION 0.1.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# --- Core engine library (shared by the executable and the tests) ---
add_library(engine_core STATIC
    src/order/Order.cpp
    src/book/OrderBook.cpp
)

target_include_directories(engine_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_options(engine_core PRIVATE -Wall -Wextra -Wpedantic)

# --- Demo executable ---
add_executable(trading_engine
    src/main.cpp
)

target_link_libraries(trading_engine PRIVATE engine_core)
target_compile_options(trading_engine PRIVATE -Wall -Wextra -Wpedantic)

# --- Tests ---
enable_testing()

find_package(GTest QUIET)
if(NOT GTest_FOUND)
    include(FetchContent)
    FetchContent_Declare(
        googletest
        URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(googletest)
endif()

add_executable(engine_tests
    tests/OrderTests.cpp
    tests/OrderBookTests.cpp
)

target_link_libraries(engine_tests PRIVATE engine_core GTest::gtest_main)
target_compile_options(engine_tests PRIVATE -Wall -Wextra -Wpedantic)

include(GoogleTest)
gtest_discover_tests(engine_tests)