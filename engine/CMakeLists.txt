cmake_minimum_required(VERSION 3.20)

project(PaperTradingEngine
    VERSION 0.1.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# --- JSON library (system copy if available, otherwise downloaded) ---
find_package(nlohmann_json 3.11 QUIET)
if(NOT nlohmann_json_FOUND)
    include(FetchContent)
    FetchContent_Declare(
        json
        URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(json)
endif()

# --- Core engine library (shared by the executables and the tests) ---
add_library(engine_core STATIC
    src/order/Order.cpp
    src/book/OrderBook.cpp
    src/protocol/EngineProtocol.cpp
)

target_include_directories(engine_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(engine_core PUBLIC nlohmann_json::nlohmann_json)
target_compile_options(engine_core PRIVATE -Wall -Wextra -Wpedantic)

# --- Demo executable (Day 14 printout) ---
add_executable(trading_engine src/main.cpp)
target_link_libraries(trading_engine PRIVATE engine_core)
target_compile_options(trading_engine PRIVATE -Wall -Wextra -Wpedantic)

# --- The engine process the backend will spawn ---
add_executable(engine_server src/engine_main.cpp)
target_link_libraries(engine_server PRIVATE engine_core)
target_compile_options(engine_server PRIVATE -Wall -Wextra -Wpedantic)

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
    tests/ProtocolTests.cpp
)

target_link_libraries(engine_tests PRIVATE engine_core GTest::gtest_main)
target_compile_options(engine_tests PRIVATE -Wall -Wextra -Wpedantic)

include(GoogleTest)
gtest_discover_tests(engine_tests)