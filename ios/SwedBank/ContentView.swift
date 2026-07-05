//
//  ContentView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct ContentView: View {
    @State private var selectedTab: AppTab = .home
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 0) {
                content(for: selectedTab)
                BottomTabBar(selectedTab: $selectedTab)
            }
            .navigationDestination(for: AppRoute.self) { route in
                route.destination
            }
        }
    }

    @ViewBuilder
    private func content(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            DashboardView(navigate: { route in path.append(route) })
        case .cards:
            CardsView(navigate: { route in path.append(route) })
        case .transfer:
            TransferView(navigate: { route in path.append(route) })
        case .settings:
            SettingsView(navigate: { route in path.append(route) })
        }
    }
}

#Preview {
    ContentView()
}
