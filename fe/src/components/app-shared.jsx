import { LayoutGridIcon, BarChart3Icon, BriefcaseIcon, UsersIcon, PlugIcon, KeyRoundIcon, SettingsIcon, CreditCardIcon, HelpCircleIcon, BookOpenIcon } from "lucide-react";

export const navGroups = [
	{
		label: "Product",
		items: [
			{
				title: "Dashboard",
				path: "#/dashboard",
				icon: (
					<LayoutGridIcon />
				),
				isActive: true,
			},
			{
				title: "Analytics",
				path: "#/analytics",
				icon: (
					<BarChart3Icon />
				),
			},
			{
				title: "Projects",
				path: "#/projects",
				icon: (
					<BriefcaseIcon />
				),
			},
		],
	},
	{
		label: "Workspace",
		items: [
			{
				title: "Team",
				path: "#/team",
				icon: (
					<UsersIcon />
				),
			},
			{
				title: "Integrations",
				path: "#/integrations",
				icon: (
					<PlugIcon />
				),
			},
			{
				title: "API Keys",
				path: "#/api-keys",
				icon: (
					<KeyRoundIcon />
				),
			},
		],
	},
	{
		label: "Administration",
		items: [
			{
				title: "Settings",
				path: "#/settings",
				icon: (
					<SettingsIcon />
				),
			},
			{
				title: "Billing",
				path: "#/billing",
				icon: (
					<CreditCardIcon />
				),
			},
		],
	},
];

export const footerNavLinks = [
	{
		title: "Help Center",
		path: "#/help",
		icon: (
			<HelpCircleIcon />
		),
	},
	{
		title: "Documentation",
		path: "#/documentation",
		icon: (
			<BookOpenIcon />
		),
	},
];

export const navLinks = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item])),
	...footerNavLinks,
];
