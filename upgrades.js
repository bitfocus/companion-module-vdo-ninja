export const upgradeScripts = [
	function (context, props) {
		//customWebsocketsConfig
		let changed = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
		if (props.config !== null) {
			let config = props.config
			if (config.wsCustom == undefined || config.wsCustom == null) {
				config.wsCustom = false
				config.wsServer = 'api.vdo.ninja'
				changed.updatedConfig = config
			}
		}
		return changed
	},
]
