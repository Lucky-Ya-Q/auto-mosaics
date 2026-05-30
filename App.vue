<script>
import { fetchSharedImages } from '@/utils/shareReceive.js'

export default {
	onLaunch() {
		console.log('App Launch')
	},
	onShow() {
		const result = fetchSharedImages()
		if (result.paths && result.paths.length > 0) {
			uni.$emit('shared-images', result)
		}
	},
	onHide() {
		console.log('App Hide')
	}
}
</script>

<style>
/*每个页面公共css */
</style>
