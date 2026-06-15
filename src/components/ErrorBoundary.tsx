import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

// 捕获渲染期异常，避免整页白屏；给用户一个可恢复的出口。
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('应用渲染出错：', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', color: '#e8eaed', maxWidth: 560 }}>
          <h2 style={{ marginBottom: 12 }}>页面出错了</h2>
          <p style={{ color: '#9aa0a6', fontSize: 13, marginBottom: 16 }}>
            {String(this.state.error.message || this.state.error)}
          </p>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>
            你的模板数据保存在本地，重新加载通常可恢复。
          </p>
          <button
            onClick={() => {
              this.setState({ error: null })
              location.reload()
            }}
            style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #2d3a64', background: '#4a9eff', color: '#fff', cursor: 'pointer' }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
