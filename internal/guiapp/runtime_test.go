package guiapp

import (
	"errors"
	"testing"

	"glmquotawatch-gui/internal/service"
)

// SetActiveProvider 未识别值应 bad_args（校验先于任何 app 交互，无 GUI 环境可测）。
func TestSetActiveProviderRejectsUnknown(t *testing.T) {
	rt := &MonitorRuntime{activeProvider: ProviderGLM}
	err := rt.SetActiveProvider("foo")
	var se *service.Error
	if !errors.As(err, &se) || se.Code != "bad_args" {
		t.Fatalf("未知 Provider 应 bad_args: %v", err)
	}
	if rt.activeProvider != ProviderGLM {
		t.Fatalf("非法切换不应改变状态: %s", rt.activeProvider)
	}
}

// SampleOpenCodeNow 在服务未启动时应报错而非 panic。
func TestSampleOpenCodeNowRequiresService(t *testing.T) {
	rt := &MonitorRuntime{}
	if _, err := rt.SampleOpenCodeNow(); err == nil {
		t.Fatalf("未启动时采样应报错")
	}
}
