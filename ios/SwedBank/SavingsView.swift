//
//  SavingsView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct SavingsView: View {
    @State private var monthlyGoal = 5000.0
    @State private var savedThisYear = 18400.0

    private let savings = BankModel.shared.savings
    private let goal = 100_000.0

    private var progress: Double {
        min(savings / goal, 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                summaryCard
                progressCard
                goalsCard
                tipsCard
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Savings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Total Savings")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white.opacity(0.85))
            Text(SEKFormatter.currency(savings))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            HStack {
                Label("+2.4% this month", systemImage: "arrow.up.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppTheme.success)
                Spacer()
                Text("1.85% APY")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(.white.opacity(0.15))
                    .clipShape(.rect(cornerRadius: 8))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background {
            LinearGradient(colors: [AppTheme.navy, AppTheme.navyMid], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.navy.opacity(0.25), radius: 14, y: 8)
    }

    private var progressCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Savings Goal")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.navy)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(AppTheme.navySoft)
                    RoundedRectangle(cornerRadius: 8)
                        .fill(AppTheme.navy)
                        .frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 10)

            HStack {
                Text(SEKFormatter.currency(savings))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Text("of \(SEKFormatter.currency(goal))")
                    .font(.system(size: 13))
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private var goalsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This Year")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Saved")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.textSecondary)
                    Text(SEKFormatter.currency(savedThisYear))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Monthly Target")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.textSecondary)
                    Text(SEKFormatter.currency(monthlyGoal))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(AppTheme.navy)
                }
            }
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private var tipsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Saving Tips", systemImage: "lightbulb.fill")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(AppTheme.gold)

            tipText("Set up automatic monthly transfers to grow your savings steadily.")
            tipText("Aim for 3–6 months of expenses in your emergency fund.")
            tipText("Review your subscriptions regularly to reduce unnecessary spending.")
        }
        .padding(16)
        .background(AppTheme.goldSoft)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
    }

    private func tipText(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle().fill(AppTheme.gold).frame(width: 5, height: 5).padding(.top, 7)
            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
}
