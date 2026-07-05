//
//  BottomTabBar.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct BottomTabBar: View {
    @Binding var selectedTab: AppTab

    private var tabs: [(AppTab, String, String)] {
        [
            (.home, "Home", "house.fill"),
            (.cards, "Cards", "creditcard.fill"),
            (.transfer, "Transfer", "arrow.left.arrow.right"),
            (.settings, "Settings", "gearshape.fill"),
        ]
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.0) { tab, label, icon in
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: icon)
                            .font(.system(size: 21, weight: .semibold))
                            .foregroundStyle(selectedTab == tab ? AppTheme.navy : AppTheme.textMuted)
                            .frame(height: 24)

                        Text(label)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(selectedTab == tab ? AppTheme.navy : AppTheme.textMuted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background {
                        if selectedTab == tab {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(AppTheme.navySoft)
                                .padding(.horizontal, 6)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 6)
        .background(.regularMaterial)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(AppTheme.navyBorder)
                .frame(height: 1)
        }
    }
}
