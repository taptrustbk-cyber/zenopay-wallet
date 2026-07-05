//
//  DepositView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct DepositView: View {
    @State private var amount = ""
    @State private var selectedMethod = DepositMethod.bankgiro
    @State private var showSuccess = false

    private let user = BankModel.shared.user

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                balanceHeader
                methodPicker
                amountField
                depositDetails
                depositButton
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Deposit")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Deposit Submitted", isPresented: $showSuccess) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Your deposit of \(SEKFormatter.currency(Double(amount.replacingOccurrences(of: " ", with: "")) ?? 0)) is being processed.")
        }
    }

    private var balanceHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Current Balance")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
            Text(SEKFormatter.currency(BankModel.shared.balance))
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
    }

    private var methodPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Deposit Method")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
            ForEach(DepositMethod.allCases) { method in
                Button {
                    selectedMethod = method
                } label: {
                    HStack {
                        Image(systemName: method.icon)
                            .foregroundStyle(AppTheme.navy)
                            .frame(width: 28)
                        Text(method.label)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(AppTheme.textPrimary)
                        Spacer()
                        Image(systemName: selectedMethod == method ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(selectedMethod == method ? AppTheme.navy : AppTheme.textMuted)
                    }
                    .padding(14)
                    .background(selectedMethod == method ? AppTheme.navySoft : .white)
                    .clipShape(.rect(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var amountField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Amount (SEK)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
            TextField("0", text: $amount)
                .keyboardType(.numberPad)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(16)
                .background(.white)
                .clipShape(.rect(cornerRadius: 14))
                .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
        }
    }

    private var depositDetails: some View {
        VStack(spacing: 10) {
            detailRow(label: "Reference", value: user.accountNumber)
            detailRow(label: "Clearing Number", value: user.clearingNumber)
            detailRow(label: "Account Holder", value: user.fullName)
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13)).foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value).font(.system(size: 13, weight: .semibold)).foregroundStyle(AppTheme.textPrimary)
        }
    }

    private var depositButton: some View {
        Button {
            showSuccess = true
        } label: {
            Text("Create Deposit Request")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppTheme.navy)
                .clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }
}

enum DepositMethod: String, CaseIterable, Identifiable {
    case bankgiro, plusgiro, swish, instant
    var id: String { rawValue }
    var label: String {
        switch self {
        case .bankgiro: return "Bankgiro Transfer"
        case .plusgiro: return "Plusgiro Transfer"
        case .swish: return "Swish"
        case .instant: return "Instant Deposit"
        }
    }
    var icon: String {
        switch self {
        case .bankgiro: return "building.columns"
        case .plusgiro: return "building.columns.fill"
        case .swish: return "bolt.fill"
        case .instant: return "arrow.down.circle"
        }
    }
}
