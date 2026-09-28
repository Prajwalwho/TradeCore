#include <gtest/gtest.h>
#include <stdexcept>
#include "TestHelpers.hpp"

using namespace engine;

TEST(OrderTest, ConstructorRejectsNonPositiveQuantity) {
    EXPECT_THROW(Order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 0, 100.0),
                 std::invalid_argument);
    EXPECT_THROW(Order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, -5, 100.0),
                 std::invalid_argument);
}

TEST(OrderTest, LimitOrderRequiresPositivePrice) {
    EXPECT_THROW(Order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 10, 0.0),
                 std::invalid_argument);
    EXPECT_THROW(Order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 10, -1.0),
                 std::invalid_argument);
}

TEST(OrderTest, MarketOrderNeedsNoPrice) {
    EXPECT_NO_THROW(Order("o1", "acc", "AAPL", Side::BUY, OrderType::MARKET, 10));
}

TEST(OrderTest, PartialThenFullFill) {
    Order order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 100, 190.0);
    EXPECT_EQ(order.getStatus(), OrderStatus::PENDING);

    order.fill(40);
    EXPECT_EQ(order.getRemainingQuantity(), 60);
    EXPECT_EQ(order.getStatus(), OrderStatus::PARTIALLY_FILLED);

    order.fill(60);
    EXPECT_EQ(order.getRemainingQuantity(), 0);
    EXPECT_EQ(order.getStatus(), OrderStatus::FILLED);
}

TEST(OrderTest, FillMoreThanRemainingThrows) {
    Order order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 100, 190.0);
    EXPECT_THROW(order.fill(101), std::invalid_argument);
    EXPECT_THROW(order.fill(0), std::invalid_argument);
}

TEST(OrderTest, CancelFilledOrderThrows) {
    Order order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 10, 190.0);
    order.fill(10);
    EXPECT_THROW(order.cancel(), std::runtime_error);
}

TEST(OrderTest, CancelKeepsFilledQuantity) {
    Order order("o1", "acc", "AAPL", Side::BUY, OrderType::LIMIT, 100, 190.0);
    order.fill(40);
    order.cancel();
    EXPECT_EQ(order.getStatus(), OrderStatus::CANCELLED);
    EXPECT_EQ(order.getFilledQuantity(), 40);
}