#pragma once

#include <string>
#include <chrono>

namespace engine {

enum class Side {
    BUY,
    SELL
};

enum class OrderType {
    MARKET,
    LIMIT
};

enum class OrderStatus {
    PENDING,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED,
    REJECTED
};

class Order {
public:
    Order(std::string id,
          std::string accountId,
          std::string instrumentSymbol,
          Side side,
          OrderType type,
          int quantity,
          double price = 0.0);

    const std::string& getId() const;
    const std::string& getAccountId() const;
    const std::string& getInstrumentSymbol() const;
    Side getSide() const;
    OrderType getType() const;
    int getQuantity() const;
    int getFilledQuantity() const;
    int getRemainingQuantity() const;
    double getPrice() const;
    OrderStatus getStatus() const;
    std::chrono::system_clock::time_point getCreatedAt() const;

    void fill(int fillQuantity);
    void cancel();
    void reject();

private:
    std::string id_;
    std::string accountId_;
    std::string instrumentSymbol_;
    Side side_;
    OrderType type_;
    int quantity_;
    int filledQuantity_;
    double price_;
    OrderStatus status_;
    std::chrono::system_clock::time_point createdAt_;
};

} // namespace engine