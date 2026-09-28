#include "protocol/EngineProtocol.hpp"

#include <chrono>
#include <memory>
#include <stdexcept>
#include <nlohmann/json.hpp>

namespace engine {

namespace {

using json = nlohmann::json;

const char* toString(OrderStatus s) {
    switch (s) {
        case OrderStatus::PENDING:          return "PENDING";
        case OrderStatus::PARTIALLY_FILLED: return "PARTIALLY_FILLED";
        case OrderStatus::FILLED:           return "FILLED";
        case OrderStatus::CANCELLED:        return "CANCELLED";
        case OrderStatus::REJECTED:         return "REJECTED";
    }
    return "UNKNOWN";
}

const char* toString(EventType t) {
    switch (t) {
        case EventType::ORDER_RESTED:    return "ORDER_RESTED";
        case EventType::TRADE_EXECUTED:  return "TRADE_EXECUTED";
        case EventType::ORDER_FILLED:    return "ORDER_FILLED";
        case EventType::ORDER_CANCELLED: return "ORDER_CANCELLED";
        case EventType::ORDER_REJECTED:  return "ORDER_REJECTED";
    }
    return "UNKNOWN";
}

Side parseSide(const std::string& s) {
    if (s == "BUY") return Side::BUY;
    if (s == "SELL") return Side::SELL;
    throw std::invalid_argument("side must be BUY or SELL");
}

OrderType parseOrderType(const std::string& s) {
    if (s == "MARKET") return OrderType::MARKET;
    if (s == "LIMIT") return OrderType::LIMIT;
    throw std::invalid_argument("type must be MARKET or LIMIT");
}

json tradeToJson(const Trade& t) {
    const auto executedAtMs = std::chrono::duration_cast<std::chrono::milliseconds>(
                                  t.executedAt.time_since_epoch()).count();
    return json{
        {"id", t.id},
        {"buyOrderId", t.buyOrderId},
        {"sellOrderId", t.sellOrderId},
        {"symbol", t.instrumentSymbol},
        {"price", t.price},
        {"quantity", t.quantity},
        {"executedAtMs", executedAtMs},
    };
}

json eventToJson(const EngineEvent& e, const std::string& reqId) {
    json j = {
        {"type", "event"},
        {"event", toString(e.type)},
        {"reqId", reqId},
    };
    if (!e.orderId.empty()) {
        j["orderId"] = e.orderId;
    }
    if (e.trade) {
        j["trade"] = tradeToJson(*e.trade);
    }
    return j;
}

} // namespace

OrderBook& EngineProtocol::bookFor(const std::string& symbol) {
    auto it = books_.find(symbol);
    if (it == books_.end()) {
        it = books_.try_emplace(symbol, symbol).first;
        it->second.setEventListener([this](const EngineEvent& e) { pending_.push_back(e); });
    }
    return it->second;
}

std::vector<std::string> EngineProtocol::handleLine(const std::string& line) {
    std::vector<std::string> out;
    pending_.clear();
    std::string reqId;   // stays empty until we have parsed it, so errors can say "unknown"

    try {
        const json cmd = json::parse(line);
        reqId = cmd.at("reqId").get<std::string>();
        const std::string kind = cmd.at("cmd").get<std::string>();

        json done = {{"type", "done"}, {"reqId", reqId}, {"ok", true}};

        if (kind == "submit") {
            auto order = std::make_shared<Order>(
                cmd.at("orderId").get<std::string>(),
                cmd.at("accountId").get<std::string>(),
                cmd.at("symbol").get<std::string>(),
                parseSide(cmd.at("side").get<std::string>()),
                parseOrderType(cmd.at("type").get<std::string>()),
                cmd.at("quantity").get<int>(),
                cmd.value("price", 0.0));

            bookFor(order->getInstrumentSymbol()).submitOrder(order);

            done["orderId"] = order->getId();
            done["status"] = toString(order->getStatus());
            done["filledQuantity"] = order->getFilledQuantity();
            done["remainingQuantity"] = order->getRemainingQuantity();

        } else if (kind == "cancel") {
            const std::string symbol = cmd.at("symbol").get<std::string>();
            const std::string orderId = cmd.at("orderId").get<std::string>();

            auto it = books_.find(symbol);
            const CancelResult result = (it == books_.end())
                ? CancelResult::NOT_FOUND
                : it->second.cancelOrder(orderId);

            done["result"] = (result == CancelResult::CANCELLED) ? "CANCELLED" : "NOT_FOUND";

        } else {
            throw std::invalid_argument("unknown cmd: " + kind);
        }

        for (const auto& event : pending_) {
            out.push_back(eventToJson(event, reqId).dump());
        }
        out.push_back(done.dump());

    } catch (const std::exception& ex) {
        // json::exception derives from std::exception, so parse errors, missing
        // fields, wrong types and Order validation errors all land here.
        out.clear();
        json err = {
            {"type", "error"},
            {"reqId", reqId.empty() ? json(nullptr) : json(reqId)},
            {"message", ex.what()},
        };
        out.push_back(err.dump());
    }

    pending_.clear();
    return out;
}

} // namespace engine