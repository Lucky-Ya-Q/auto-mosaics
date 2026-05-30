<template>
	<view class="page">
		<view class="header">
			<text class="title">分享接收</text>
			<text class="hint">在相册选中图片后，点「发送」并选择本应用</text>
		</view>

		<view v-if="images.length === 0" class="empty">
			<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
			<text class="empty-text">暂无图片，请从相册分享到此应用</text>
		</view>

		<scroll-view v-else scroll-y class="list">
			<view class="grid">
				<view
					v-for="(src, index) in images"
					:key="index"
					class="thumb-wrap"
					@click="preview(index)"
				>
					<image class="thumb" :src="src" mode="widthFix" />
				</view>
			</view>
		</scroll-view>

		<view v-if="images.length > 0" class="footer">
			<button
				class="save-btn"
				type="primary"
				:loading="processing"
				:disabled="processing"
				@click="handleProcessAndSave"
			>
				处理并保存
			</button>
		</view>

		<view v-if="processing" class="progress-mask">
			<view class="progress-box">
				<text class="progress-title">正在处理图片</text>
				<text class="progress-text">{{ progressText }}</text>
				<progress
					class="progress-bar"
					:percent="progress"
					stroke-width="8"
					activeColor="#007aff"
					backgroundColor="#e5e5e5"
				/>
				<text class="progress-percent">{{ progress }}%</text>
			</view>
		</view>
	</view>
</template>

<script>
import { fetchSharedImages } from '@/utils/shareReceive.js'
import {
	processImageWhiteBand,
	saveImageToAlbum,
	saveCutOffDividerToAlbum,
	requestSavePermission
} from '@/utils/imageProcess.js'

export default {
	data() {
		return {
			images: [],
			processing: false,
			progress: 0,
			progressText: ''
		}
	},
	onLoad() {
		this.loadSharedImages()
		uni.$on('shared-images', this.onSharedImages)
	},
	onShow() {
		this.loadSharedImages()
	},
	onUnload() {
		uni.$off('shared-images', this.onSharedImages)
	},
	methods: {
		onSharedImages(result) {
			this.applyResult(result)
		},
		loadSharedImages() {
			this.applyResult(fetchSharedImages())
		},
		applyResult(result) {
			if (!result || !result.paths || result.paths.length === 0) {
				return
			}
			this.images = result.paths
		},
		preview(index) {
			uni.previewImage({
				current: index,
				urls: this.images
			})
		},
		async handleProcessAndSave() {
			if (this.processing || this.images.length === 0) {
				return
			}

			const granted = await requestSavePermission()
			if (!granted) {
				uni.showToast({ title: '需要相册权限', icon: 'none' })
				return
			}

			this.processing = true
			this.progress = 0
			this.progressText = '准备中...'

			const total = this.images.length
			let savedCount = 0

			try {
				await saveCutOffDividerToAlbum()

				for (let i = 0; i < total; i++) {
					this.progressText = `处理第 ${i + 1} / ${total} 张`
					this.progress = Math.floor((i / total) * 100)

					const tempPath = await processImageWhiteBand(this, this.images[i])
					await saveImageToAlbum(tempPath)
					savedCount++

					this.progress = Math.floor(((i + 1) / total) * 100)
					this.progressText = `已保存 ${savedCount} / ${total} 张`
				}

				uni.showToast({
					title: `已保存${savedCount}张`,
					icon: 'success',
					duration: 2000
				})
			} catch (err) {
				console.error('process and save failed', err)
				uni.showModal({
					title: '处理失败',
					content: err && err.message ? err.message : '部分图片处理或保存失败',
					showCancel: false
				})
			} finally {
				this.processing = false
				this.progressText = ''
			}
		}
	}
}
</script>

<style>
.page {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background: #f8f8f8;
}

.header {
	padding: 40rpx 32rpx 24rpx;
	flex-shrink: 0;
}

.title {
	display: block;
	font-size: 40rpx;
	font-weight: 600;
	color: #333;
}

.hint {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #888;
	line-height: 1.5;
}

.empty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 160rpx;
}

.logo {
	width: 160rpx;
	height: 160rpx;
	opacity: 0.6;
}

.empty-text {
	margin-top: 32rpx;
	font-size: 28rpx;
	color: #999;
}

.list {
	flex: 1;
	height: 0;
	align-self: stretch;
}

.grid {
	display: flex;
	flex-wrap: wrap;
	align-content: flex-start;
	padding: 16rpx;
	gap: 16rpx;
	padding-bottom: 32rpx;
}

.thumb-wrap {
	width: calc(50% - 8rpx);
	height: 320rpx;
	overflow: hidden;
	border-radius: 12rpx;
	background: #eee;
}

.thumb {
	width: 100%;
	height: auto;
	display: block;
	vertical-align: top;
}

.footer {
	flex-shrink: 0;
	padding: 24rpx 32rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	background: #fff;
	border-top: 1rpx solid #eee;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.save-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 32rpx;
	border-radius: 44rpx;
}

.progress-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

.progress-box {
	width: 560rpx;
	padding: 48rpx 40rpx;
	background: #fff;
	border-radius: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.progress-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #333;
}

.progress-text {
	margin-top: 20rpx;
	font-size: 28rpx;
	color: #666;
}

.progress-bar {
	width: 100%;
	margin-top: 32rpx;
}

.progress-percent {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #007aff;
}

</style>
