//
//  TransferView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct TransferView: View {
    let navigate: (AppRoute) -> Void

    private let user = BankModel.shared.user

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                accountSection
                actionsGrid
                ibanSection
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Transfer")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Your Account")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)

            VStack(spacing: 10) {
                infoRow(label: "Account", value: user.accountNumber)
                infoRow(label: "Clearing", value: user.clearingNumber)
                infoRow(label: "IBAN", value: SEKFormatter.iban(user.iban))
                infoRow(label: "BIC / SWIFT", value: user.bic)
            }
            .padding(16)
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textPrimary)
        }
    }

    private var actionsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            transferAction(icon: "arrow.right", title: "Send Money", subtitle: "Bank transfer") {
                navigate(.sendMoney)
            }
            transferAction(icon: "arrow.down", title: "Deposit", subtitle: "Add funds") {
                navigate(.deposit)
            }
            transferAction(icon: "arrow.up", title: "Withdraw", subtitle: "Cash out") {
                navigate(.withdraw)
            }
            transferAction(icon: "qrcode", title: "QR Payment", subtitle: "Scan & pay") {
                navigate(.qrPay)
            }
        }
    }

    private func transferAction(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(AppTheme.navy)
                    .clipShape(.rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
            }
            .padding(14)
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
        }
        .buttonStyle(.plain)
    }

    private var ibanSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Quick IBAN Copy", systemImage: "doc.on.doc.fill")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)

            HStack {
                Text(SEKFormatter.iban(user.iban))
                    .font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Image(systemName: "doc.on.doc")
                    .foregroundStyle(AppTheme.navy)
            }
            .padding(14)
            .background(AppTheme.navySoft)
            .clipShape(.rect(cornerRadius: 12))
        }
    }
}
