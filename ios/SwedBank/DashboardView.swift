//
//  DashboardView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct DashboardView: View {
    let navigate: (AppRoute) -> Void
    @State private var isBalanceHidden = false

    private let user = BankModel.shared.user
    private let balance = BankModel.shared.balance
    private let transactions = BankModel.shared.transactions

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                header
                balanceCard
                quickActions
                recentTransactions
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Good day,")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(AppTheme.textSecondary)
                Text(user.fullName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            Spacer()
            Button {
                navigate(.profile)
            } label: {
                Circle()
                    .fill(AppTheme.navy)
                    .frame(width: 42, height: 42)
                    .overlay {
                        Text(user.fullName.prefix(1))
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                    }
            }
        }
        .padding(.top, 12)
    }

    private var balanceCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Account Balance")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.85))
                Spacer()
                Button {
                    isBalanceHidden.toggle()
                } label: {
                    Image(systemName: isBalanceHidden ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }

            Text(isBalanceHidden ? "•••••• kr" : SEKFormatter.currency(balance))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: 16) {
                accountInfo(label: "IBAN", value: SEKFormatter.maskedIBAN(user.iban))
                accountInfo(label: "BIC", value: user.bic)
            }
            .padding(.top, 4)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            LinearGradient(
                colors: [AppTheme.navy, AppTheme.navyMid],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.navy.opacity(0.25), radius: 16, y: 8)
    }

    private func accountInfo(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.white.opacity(0.6))
            Text(value)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.95))
        }
    }

    private var quickActions: some View {
        HStack(spacing: 12) {
            actionItem(icon: "arrow.down", label: "Deposit") { navigate(.deposit) }
            actionItem(icon: "arrow.up", label: "Withdraw") { navigate(.withdraw) }
            actionItem(icon: "arrow.right", label: "Send") { navigate(.sendMoney) }
            actionItem(icon: "qrcode", label: "QR Pay") { navigate(.qrPay) }
        }
    }

    private func actionItem(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.navy)
                    .frame(width: 44, height: 44)
                    .background(AppTheme.navySoft)
                    .clipShape(.rect(cornerRadius: 14))

                Text(label)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.12), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
    }

    private var recentTransactions: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Transactions")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Button("See all") {
                    navigate(.transactions)
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.navy)
            }

            VStack(spacing: 0) {
                ForEach(transactions.prefix(5)) { tx in
                    TransactionRow(tx: tx)
                    if tx.id != transactions.prefix(5).last?.id {
                        Divider().background(AppTheme.navyBorder).padding(.leading, 48)
                    }
                }
            }
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
        }
    }
}

struct TransactionRow: View {
    let tx: DemoTransaction

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: tx.category.icon)
                .font(.system(size: 16))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(tx.category.tint)
                .clipShape(.rect(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 2) {
                Text(tx.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(tx.subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(tx.amount > 0 ? "+" : "")\(SEKFormatter.currency(tx.amount))")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(tx.amount > 0 ? AppTheme.success : AppTheme.textPrimary)
                Text(tx.date.formatted(.dateTime.month().day()))
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.textMuted)
            }
        }
        .padding(14)
    }
}
