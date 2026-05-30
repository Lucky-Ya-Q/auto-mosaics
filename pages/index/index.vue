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
				<image
					v-for="(src, index) in images"
					:key="index"
					class="thumb"
					:src="src"
					mode="aspectFill"
					@click="preview(index)"
				></image>
			</view>
		</scroll-view>

		<view v-if="debug" class="debug">
			<text>{{ debug }}</text>
		</view>
	</view>
</template>

<script>
import { fetchSharedImages } from '@/utils/shareReceive.js'

export default {
	data() {
		return {
			images: [],
			debug: ''
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
			this.debug = result.debug || ''
		},
		preview(index) {
			uni.previewImage({
				current: index,
				urls: this.images
			})
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background: #f8f8f8;
}

.header {
	padding: 40rpx 32rpx 24rpx;
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
	height: calc(100vh - 220rpx);
}

.grid {
	display: flex;
	flex-wrap: wrap;
	padding: 16rpx;
	gap: 16rpx;
}

.thumb {
	width: calc(50% - 8rpx);
	height: 320rpx;
	border-radius: 12rpx;
	background: #eee;
}

.debug {
	padding: 16rpx 32rpx 32rpx;
	font-size: 22rpx;
	color: #aaa;
	word-break: break-all;
}
</style>
