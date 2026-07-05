//
//  BankModel.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI
import Foundation

/// Demo Swedish banking data — fictional, for demonstration only.
struct BankModel {
    static let shared = BankModel()

    let user = DemoUser(
        fullName: "Erik Lindberg",
        email: "erik.lindberg@swedbank.se",
        phone: "+46 70 123 45 67",
        address: "Sveavägen 24, 113 57 Stockholm",
        iban: "SE4550000000058398257466",
        bic: "SWEDSESS",
        accountNumber: "5839 825 746",
        clearingNumber: "5000"
    )

    let balance: Double = 125_420.50
    let savings: Double = 48_200.00

    let cards: [DemoCard] = [
        DemoCard(
            id: "1",
            holder: "ERIK LINDBERG",
            number: "5412 •••• •••• 7466",
            brand: .mastercard,
            expiry: "08/29",
            gradient: [.navy, .navyMid],
            balance: 125_420.50
        ),
        DemoCard(
            id: "2",
            holder: "ERIK LINDBERG",
            number: "4571 •••• •••• 1234",
            brand: .visa,
            expiry: "11/27",
            gradient: [.navyDark, .navy],
            balance: 48_200.00
        )
    ]

    let transactions: [DemoTransaction] = [
        DemoTransaction(id: "1", title: "ICA Maxi", subtitle: "Groceries", amount: -428.75, date: Date(timeIntervalSinceNow: -3600), category: .shopping, status: .completed),
        DemoTransaction(id: "2", title: "Salary — Acme AB", subtitle: "Incoming transfer", amount: 32_500.00, date: Date(timeIntervalSinceNow: -86400), category: .income, status: .completed),
        DemoTransaction(id: "3", title: "SL Public Transport", subtitle: "Travel card top-up", amount: -860.00, date: Date(timeIntervalSinceNow: -172800), category: .transport, status: .completed),
        DemoTransaction(id: "4", title: "Spotify Premium", subtitle: "Subscription", amount: -99.00, date: Date(timeIntervalSinceNow: -259200), category: .subscription, status: .completed),
        DemoTransaction(id: "5", title: "Transfer to Anna Lindberg", subtitle: "Bank transfer", amount: -1_500.00, date: Date(timeIntervalSinceNow: -345600), category: .transfer, status: .completed),
        DemoTransaction(id: "6", title: "Refund — Elgiganten", subtitle: "Returned item", amount: 1_199.00, date: Date(timeIntervalSinceNow: -432000), category: .refund, status: .completed),
        DemoTransaction(id: "7", title: "Restaurant Sture", subtitle: "Dining", amount: -685.50, date: Date(timeIntervalSinceNow: -518400), category: .dining, status: .completed),
        DemoTransaction(id: "8", title: "ATM withdrawal", subtitle: "Norrmalm", amount: -2_000.00, date: Date(timeIntervalSinceNow: -604800), category: .withdrawal, status: .completed)
    ]
}

struct DemoUser {
    let fullName: String
    let email: String
    let phone: String
    let address: String
    let iban: String
    let bic: String
    let accountNumber: String
    let clearingNumber: String
}

enum CardBrand {
    case visa, mastercard

    var label: String {
        switch self {
        case .visa: return "VISA"
        case .mastercard: return "Mastercard"
        }
    }
}

struct DemoCard: Identifiable {
    let id: String
    let holder: String
    let number: String
    let brand: CardBrand
    let expiry: String
    let gradient: [Color]
    let balance: Double
}

enum TransactionCategory {
    case shopping, income, transport, subscription, transfer, refund, dining, withdrawal

    var icon: String {
        switch self {
        case .shopping: return "bag.fill"
        case .income: return "arrow.down.circle.fill"
        case .transport: return "bus.fill"
        case .subscription: return "play.circle.fill"
        case .transfer: return "arrow.left.arrow.right.circle.fill"
        case .refund: return "arrow.uturn.backward.circle.fill"
        case .dining: return "fork.knife.circle.fill"
        case .withdrawal: return "banknote.fill"
        }
    }

    var tint: Color {
        switch self {
        case .income, .refund: return AppTheme.success
        case .withdrawal, .transfer: return AppTheme.navy
        case .shopping: return Color(hex: "7C5CBF")
        case .transport: return Color(hex: "2B7FD4")
        case .subscription: return Color(hex: "E0653A")
        case .dining: return Color(hex: "D4943A")
        }
    }
}

enum TransactionStatus {
    case completed, pending, failed

    var label: String {
        switch self {
        case .completed: return "Completed"
        case .pending: return "Pending"
        case .failed: return "Failed"
        }
    }

    var tint: Color {
        switch self {
        case .completed: return AppTheme.success
        case .pending: return AppTheme.warning
        case .failed: return AppTheme.danger
        }
    }
}

struct DemoTransaction: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let amount: Double
    let date: Date
    let category: TransactionCategory
    let status: TransactionStatus
}

extension Color {
    static let navy = AppTheme.navy
    static let navyDark = AppTheme.navyDark
    static let navyMid = AppTheme.navyMid
}
