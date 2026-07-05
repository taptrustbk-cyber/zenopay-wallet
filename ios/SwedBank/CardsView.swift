//
//  CardsView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct CardsView: View {
    let navigate: (AppRoute) -> Void
    @State private var selectedCard: DemoCard?

    private let cards = BankModel.shared.cards

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Your Cards")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(cards) { card in
                    BankCardView(card: card)
                        .onTapGesture { selectedCard = card }
                }

                savingsCard
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Cards")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedCard) { card in
            CardDetailView(card: card)
                .presentationDetents([.medium])
        }
    }

    private var savingsCard: some View {
        Button { navigate(.savings) } label: {
            HStack {
                Image(systemName: "piggy.bank.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(AppTheme.gold)
                    .frame(width: 46, height: 46)
                    .background(AppTheme.goldSoft)
                    .clipShape(.rect(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 3) {
                    Text("Savings Account")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(SEKFormatter.currency(BankModel.shared.savings))
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(AppTheme.textMuted)
            }
            .padding(16)
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
    }
}

struct BankCardView: View {
    let card: DemoCard

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Image(systemName: "creditcard.fill")
                    .foregroundStyle(.white.opacity(0.85))
                Spacer()
                Text(card.brand.label)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
            }

            Spacer()

            Text(card.number)
                .font(.system(size: 17, weight: .semibold, design: .monospaced))
                .foregroundStyle(.white)
                .kerning(1)

            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("CARD HOLDER")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.6))
                    Text(card.holder)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Spacer()
                VStack(alignment: .leading, spacing: 3) {
                    Text("EXPIRES")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.6))
                    Text(card.expiry)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text("BALANCE")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.6))
                    Text(SEKFormatter.currency(card.balance))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
        }
        .padding(20)
        .frame(height: 190)
        .frame(maxWidth: .infinity)
        .background {
            LinearGradient(colors: card.gradient, startPoint: .topLeading, endPoint: .bottomTrailing)
        }
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.navy.opacity(0.22), radius: 14, y: 8)
    }
}

struct CardDetailView: View {
    let card: DemoCard

    var body: some View {
        VStack(spacing: 18) {
            BankCardView(card: card)
                .padding(.horizontal, 18)

            VStack(spacing: 12) {
                detailRow(label: "Card Number", value: card.number)
                detailRow(label: "Card Holder", value: card.holder)
                detailRow(label: "Expires", value: card.expiry)
                detailRow(label: "Balance", value: SEKFormatter.currency(card.balance))
            }
            .padding(.horizontal, 18)
            Spacer()
        }
        .padding(.top, 20)
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .padding(14)
        .background(AppTheme.surfaceSecondary)
        .clipShape(.rect(cornerRadius: 12))
    }
}
