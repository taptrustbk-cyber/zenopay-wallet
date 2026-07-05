//
//  AppNavigation.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

enum AppTab: Hashable {
    case home
    case cards
    case transfer
    case settings
}

enum AppRoute: Hashable {
    case transactions
    case deposit
    case withdraw
    case sendMoney
    case qrPay
    case statements
    case savings
    case profile
    case privacyPolicy
    case termsConditions
    case support

    @MainActor
    @ViewBuilder
    var destination: some View {
        switch self {
        case .transactions:
            TransactionsView()
        case .deposit:
            DepositView()
        case .withdraw:
            WithdrawView()
        case .sendMoney:
            SendMoneyView()
        case .qrPay:
            QRPayView()
        case .statements:
            StatementsView()
        case .savings:
            SavingsView()
        case .profile:
            ProfileView()
        case .privacyPolicy:
            LegalView(mode: .privacy)
        case .termsConditions:
            LegalView(mode: .terms)
        case .support:
            SupportView()
        }
    }
}
