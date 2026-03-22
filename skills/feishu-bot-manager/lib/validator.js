/**
 * 配置验证工具
 */

// 验证 App ID 格式
function validateAppId(appId) {
  return /^cli_[a-zA-Z0-9]+$/.test(appId);
}

// 验证账户 ID 格式（小写字母、数字、连字符）
function validateAccountId(id) {
  return /^[a-z0-9-]+$/.test(id);
}

// 验证 Agent ID 格式（小写字母、数字、连字符）
function validateAgentId(id) {
  return /^[a-z0-9-]+$/.test(id);
}

// 验证群聊 ID 格式
function validateChatId(id) {
  return /^oc_[a-zA-Z0-9]+$/.test(id);
}

// 验证用户 ID 格式
function validateUserId(id) {
  return /^ou_[a-zA-Z0-9]+$/.test(id);
}

// 验证完整配置
function validateConfig(config) {
  const errors = [];

  if (!config.channels?.feishu) {
    errors.push('缺少 channels.feishu 配置');
    return errors;
  }

  const accounts = config.channels.feishu.accounts || {};

  for (const [key, acc] of Object.entries(accounts)) {
    if (key === 'default') continue; // default 账户可以为空对象
    if (!validateAccountId(key)) {
      errors.push(`账户 ID "${key}" 格式无效（只能包含小写字母、数字、连字符）`);
    }
    if (!acc.appId) {
      // default 账户可能没有独立的 appId
      if (key !== 'default') {
        errors.push(`[${key}] App ID 不能为空`);
      }
    } else if (!validateAppId(acc.appId)) {
      errors.push(`[${key}] App ID 格式无效: ${acc.appId}`);
    }
    if (key !== 'default' && !acc.appSecret) {
      errors.push(`[${key}] App Secret 不能为空`);
    }
  }

  // 验证 bindings
  const bindings = config.bindings || [];
  for (const binding of bindings) {
    if (!binding.agentId) {
      errors.push('存在缺少 agentId 的 binding');
    }
    if (!binding.match) {
      errors.push('存在缺少 match 的 binding');
    } else if (!binding.match.accountId && !binding.match.peer?.id) {
      errors.push(`binding(agentId: ${binding.agentId}) 缺少 accountId 或 peer.id`);
    }
  }

  // 验证 agents.list
  const agents = config.agents?.list || [];
  for (const agent of agents) {
    if (!agent.id) {
      errors.push('存在缺少 id 的 agent');
    } else if (!validateAgentId(agent.id)) {
      errors.push(`Agent ID "${agent.id}" 格式无效`);
    }
    if (!agent.workspace) {
      errors.push(`[${agent.id}] 缺少 workspace 路径`);
    }
  }

  // 检查 bindings 引用的 agentId 是否存在于 agents.list
  const agentIds = new Set(agents.map(a => a.id));
  for (const binding of bindings) {
    if (binding.agentId && agentIds.size > 0 && !agentIds.has(binding.agentId)) {
      errors.push(`binding 引用了不存在的 agentId: ${binding.agentId}`);
    }
  }

  // 检查 dmScope 设置
  if (Object.keys(accounts).length > 1 && config.session?.dmScope !== 'per-account-channel-peer') {
    errors.push('多账户模式建议设置 session.dmScope 为 "per-account-channel-peer"');
  }

  return errors;
}

module.exports = {
  validateAppId,
  validateAccountId,
  validateAgentId,
  validateChatId,
  validateUserId,
  validateConfig
};
