//
//  WithdrawView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct WithdrawView: View {
    @State private var amount = ""
    @State private var selectedMethod = WithdrawMethod.bankTransfer
    @State private var showSuccess = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                balanceHeader
                methodPicker
                amountField
                recipientField
                withdrawButton
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Withdraw")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Withdrawal Submitted", isPresented: $showSuccess) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Your withdrawal request is being processed.")
        }
    }

    private var balanceHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Available Balance")
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
            Text("Withdraw Method")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
            ForEach(WithdrawMethod.allCases) { method in
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

    private var recipientField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Recipient Account (IBAN)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
            TextField("SE## #### #### #### #### ####", text: .constant(""))
                .keyboardType(.asciiCapable)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.characters)
                .font(.system(size: 15, weight: .semibold, design: .monospaced))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(16)
                .background(.white)
                .clipShape(.rect(cornerRadius: 14))
                .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
        }
    }

    private var withdrawButton: some View {
        Button {
            showSuccess = true
        } label: {
            Text("Submit Withdrawal Request")
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

enum WithdrawMethod: String, CaseIterable, Identifiable {
    case bankTransfer, atm, swish
    var id: String { rawValue }
    var label: String {
        switch self {
        case .bankTransfer: return "Bank Transfer"
        case .atm: return "ATM Withdrawal"
        case .swish: return "Swish"
        }
    }
    var icon: String {
        switch self {
        case .bankTransfer: return "building.columns"
        case .atm: return "banknote"
        case .swish: return "bolt.fill"
        }
    }
}
