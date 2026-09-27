#pragma once

#include "execution/Trade.hpp"
#include <vector>
#include <map>
#include <deque>
#include <unordered_map>
#include <memory>
#include <functional>
#include <optional>
#include <string>
#include "order/Order.hpp"

namespace engine {

class OrderBook {
public:

    std::vector<Trade> submitOrder(std::shared_ptr<Order> order);
    
    explicit OrderBook(std::string instrumentSymbol);

    void addOrder(std::shared_ptr<Order> order);
    bool removeOrder(const std::string& orderId);

    std::optional<double> getBestBid() const;
    std::optional<double> getBestAsk() const;

    size_t getBidLevelCount() const;
    size_t getAskLevelCount() const;

    const std::string& getInstrumentSymbol() const;

private:
    using PriceLevel = std::deque<std::shared_ptr<Order>>;
    using BidMap = std::map<double, PriceLevel, std::greater<double>>;
    using AskMap = std::map<double, PriceLevel>;

    std::string instrumentSymbol_;
    BidMap bids_;
    AskMap asks_;
    std::unordered_map<std::string, std::shared_ptr<Order>> ordersById_;
};

} // namespace engine