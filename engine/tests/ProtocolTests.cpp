#include <gtest/gtest.h>
#include <nlohmann/json.hpp>
#include <string>
#include <vector>
#include "protocol/EngineProtocol.hpp"

using namespace engine;
using json = nlohmann::json;

namespace {

std::string submit(const std::string& reqId, const std::string& orderId,
                   const std::string& symbol, const std::string& side,
                   const std::string& type, int quantity, double price = 0.0) {
    json cmd = {
        {"cmd", "submit"}, {"reqId", reqId}, {"orderId", orderId},
        {"accountId", "acc-" + orderId}, {"symbol", symbol},
        {"side", side}, {"type", type}, {"quantity", quantity},
    };
    if (price > 0.0) {
        cmd["price"] = price;
    }
    return cmd.dump();
}

std::string cancel(const std::string& reqId, const std::string& symbol, const std::string& orderId) {
    json cmd = {{"cmd", "cancel"}, {"reqId", reqId}, {"symbol", symbol}, {"orderId", orderId}};
    return cmd.dump();
}

std::vector<json> run(EngineProtocol& protocol, const std::string& line) {
    std::vector<json> parsed;
    for (const auto& s : protocol.handleLine(line)) {
        parsed.push_back(json::parse(s));
    }
    return parsed;
}

// Small accessors so the assertions stay plain-typed.
std::string str(const json& j, const char* key) { return j.at(key).get<std::string>(); }
int num(const json& j, const char* key) { return j.at(key).get<int>(); }
double dbl(const json& j, const char* key) { return j.at(key).get<double>(); }
bool flag(const json& j, const char* key) { return j.at(key).get<bool>(); }

} // namespace

TEST(ProtocolTest, RestingLimitOrderProducesRestedEventThenDone) {
    EngineProtocol protocol;
    auto out = run(protocol, submit("r1", "s1", "AAPL", "SELL", "LIMIT", 100, 190.0));

    ASSERT_EQ(out.size(), 2u);
    EXPECT_EQ(str(out[0], "type"), "event");
    EXPECT_EQ(str(out[0], "event"), "ORDER_RESTED");
    EXPECT_EQ(str(out[0], "orderId"), "s1");
    EXPECT_EQ(str(out[1], "type"), "done");
    EXPECT_EQ(str(out[1], "reqId"), "r1");
    EXPECT_TRUE(flag(out[1], "ok"));
    EXPECT_EQ(str(out[1], "status"), "PENDING");
    EXPECT_EQ(num(out[1], "remainingQuantity"), 100);
}

TEST(ProtocolTest, CrossingOrderProducesTradeThenFillsThenDone) {
    EngineProtocol protocol;
    run(protocol, submit("r1", "s1", "AAPL", "SELL", "LIMIT", 100, 190.0));
    auto out = run(protocol, submit("r2", "b1", "AAPL", "BUY", "LIMIT", 100, 191.0));

    ASSERT_EQ(out.size(), 4u);

    EXPECT_EQ(str(out[0], "event"), "TRADE_EXECUTED");
    const json& trade = out[0].at("trade");
    EXPECT_EQ(str(trade, "buyOrderId"), "b1");
    EXPECT_EQ(str(trade, "sellOrderId"), "s1");
    EXPECT_EQ(dbl(trade, "price"), 190.0);   // the resting order's price
    EXPECT_EQ(num(trade, "quantity"), 100);

    EXPECT_EQ(str(out[1], "event"), "ORDER_FILLED");
    EXPECT_EQ(str(out[1], "orderId"), "s1");
    EXPECT_EQ(str(out[2], "event"), "ORDER_FILLED");
    EXPECT_EQ(str(out[2], "orderId"), "b1");

    EXPECT_EQ(str(out[3], "type"), "done");
    EXPECT_EQ(str(out[3], "status"), "FILLED");
    EXPECT_EQ(num(out[3], "filledQuantity"), 100);

    for (const auto& line : out) {
        EXPECT_EQ(str(line, "reqId"), "r2");   // every line carries the request id
    }
}

TEST(ProtocolTest, PartiallyFilledMarketOrderReportsPartialStatus) {
    EngineProtocol protocol;
    run(protocol, submit("r1", "s1", "AAPL", "SELL", "LIMIT", 30, 192.0));
    auto out = run(protocol, submit("r2", "m1", "AAPL", "BUY", "MARKET", 100));

    const json& done = out.back();
    EXPECT_EQ(str(done, "type"), "done");
    EXPECT_EQ(str(done, "status"), "PARTIALLY_FILLED");   // not REJECTED: 30 shares really traded
    EXPECT_EQ(num(done, "filledQuantity"), 30);
    EXPECT_EQ(num(done, "remainingQuantity"), 70);
}

TEST(ProtocolTest, MarketOrderWithNoLiquidityIsRejected) {
    EngineProtocol protocol;
    auto out = run(protocol, submit("r1", "m1", "AAPL", "BUY", "MARKET", 10));

    ASSERT_EQ(out.size(), 2u);
    EXPECT_EQ(str(out[0], "event"), "ORDER_REJECTED");
    EXPECT_EQ(str(out[1], "status"), "REJECTED");
    EXPECT_TRUE(flag(out[1], "ok"));   // the command itself succeeded; the order was rejected
}

TEST(ProtocolTest, CancelRestingOrderThenCancelAgain) {
    EngineProtocol protocol;
    run(protocol, submit("r1", "s1", "AAPL", "SELL", "LIMIT", 100, 190.0));

    auto first = run(protocol, cancel("r2", "AAPL", "s1"));
    ASSERT_EQ(first.size(), 2u);
    EXPECT_EQ(str(first[0], "event"), "ORDER_CANCELLED");
    EXPECT_EQ(str(first[0], "orderId"), "s1");
    EXPECT_EQ(str(first[1], "type"), "done");
    EXPECT_EQ(str(first[1], "result"), "CANCELLED");

    auto second = run(protocol, cancel("r3", "AAPL", "s1"));
    ASSERT_EQ(second.size(), 1u);
    EXPECT_EQ(str(second[0], "result"), "NOT_FOUND");
    EXPECT_TRUE(flag(second[0], "ok"));
}

TEST(ProtocolTest, CancelOnUnknownSymbolIsNotFound) {
    EngineProtocol protocol;
    auto out = run(protocol, cancel("r1", "MSFT", "whatever"));

    ASSERT_EQ(out.size(), 1u);
    EXPECT_EQ(str(out[0], "type"), "done");
    EXPECT_EQ(str(out[0], "result"), "NOT_FOUND");
}

TEST(ProtocolTest, BooksAreIndependentPerSymbol) {
    EngineProtocol protocol;
    run(protocol, submit("r1", "s1", "AAPL", "SELL", "LIMIT", 100, 190.0));
    auto out = run(protocol, submit("r2", "b1", "TSLA", "BUY", "LIMIT", 100, 200.0));

    ASSERT_EQ(out.size(), 2u);   // rested in TSLA's book, no trade with AAPL's order
    EXPECT_EQ(str(out[0], "event"), "ORDER_RESTED");
    EXPECT_EQ(str(out[1], "status"), "PENDING");
}

TEST(ProtocolTest, MalformedJsonReturnsErrorWithNullReqId) {
    EngineProtocol protocol;
    auto out = run(protocol, "this is not json");

    ASSERT_EQ(out.size(), 1u);
    EXPECT_EQ(str(out[0], "type"), "error");
    EXPECT_TRUE(out[0].at("reqId").is_null());
}

TEST(ProtocolTest, MissingFieldReturnsErrorWithReqId) {
    EngineProtocol protocol;
    json cmd = {{"cmd", "submit"}, {"reqId", "r9"}, {"symbol", "AAPL"}};
    auto out = run(protocol, cmd.dump());

    ASSERT_EQ(out.size(), 1u);
    EXPECT_EQ(str(out[0], "type"), "error");
    EXPECT_EQ(str(out[0], "reqId"), "r9");
}

TEST(ProtocolTest, BadSideReturnsError) {
    EngineProtocol protocol;
    auto out = run(protocol, submit("r1", "o1", "AAPL", "SIDEWAYS", "LIMIT", 10, 100.0));

    ASSERT_EQ(out.size(), 1u);
    EXPECT_EQ(str(out[0], "type"), "error");
    EXPECT_EQ(str(out[0], "reqId"), "r1");
}

TEST(ProtocolTest, InvalidOrderFieldsReturnErrors) {
    EngineProtocol protocol;

    auto zeroQty = run(protocol, submit("r1", "o1", "AAPL", "BUY", "LIMIT", 0, 100.0));
    ASSERT_EQ(zeroQty.size(), 1u);
    EXPECT_EQ(str(zeroQty[0], "type"), "error");

    auto limitWithoutPrice = run(protocol, submit("r2", "o2", "AAPL", "BUY", "LIMIT", 10));
    ASSERT_EQ(limitWithoutPrice.size(), 1u);
    EXPECT_EQ(str(limitWithoutPrice[0], "type"), "error");
}

TEST(ProtocolTest, UnknownCommandReturnsError) {
    EngineProtocol protocol;
    json cmd = {{"cmd", "explode"}, {"reqId", "r1"}};
    auto out = run(protocol, cmd.dump());

    ASSERT_EQ(out.size(), 1u);
    EXPECT_EQ(str(out[0], "type"), "error");
    EXPECT_EQ(str(out[0], "reqId"), "r1");
}

TEST(ProtocolTest, ErrorDoesNotDisturbLaterCommands) {
    EngineProtocol protocol;
    auto bad = run(protocol, "garbage");
    ASSERT_EQ(bad.size(), 1u);

    auto good = run(protocol, submit("r1", "s1", "AAPL", "SELL", "LIMIT", 10, 190.0));
    ASSERT_EQ(good.size(), 2u);
    EXPECT_EQ(str(good[1], "type"), "done");
}