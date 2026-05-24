import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Table } from 'antd';
import ParentController from '../../../api/parent/ParentController';
import { pickDefaultParent, resolveParentId } from '../resolveParentColumn';
import {
  clearActionPreview,
  getActivePreview,
  subscribePreview,
} from './pluginUiRegistry';

const { TextArea } = Input;

function NodesBatchPreview({ proposal, onChange }) {
  const [rows, setRows] = useState(() =>
    proposal.nodes?.length ? proposal.nodes : [],
  );
  const [parents, setParents] = useState([]);

  const emitChange = (nextRows) => {
    setRows(nextRows);
    onChange({ ...proposal, nodes: nextRows });
  };

  useEffect(() => {
    if (proposal.nodes?.length) {
      setRows(proposal.nodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when modal opens with new proposal
  }, [proposal.type, proposal.nodes?.length, proposal.nodes?.[0]?.nodeTitle]);

  useEffect(() => {
    let cancelled = false;
    ParentController.getParents()
      .then((data) => {
        if (cancelled) return;
        const list = Object.values(data || {}).map((p) => ({
          id: p.id,
          title: p.title || p.parentTitle || p.id,
        }));
        setParents(list);
        if (!list.length) return;
        setRows((prev) => {
          const base = prev.length ? prev : proposal.nodes || [];
          const next = base.map((row) => ({
            ...row,
            parentId:
              resolveParentId(row.parentId, list) ||
              pickDefaultParent(list)?.id ||
              row.parentId,
          }));
          onChange({ ...proposal, nodes: next });
          return next;
        });
      })
      .catch(() => setParents([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load parents once per modal open
  }, []);

  const columns = [
    {
      title: 'Title',
      dataIndex: 'nodeTitle',
      width: '22%',
      render: (v, _, i) => (
        <Input
          value={v}
          onChange={(e) => {
            const next = [...rows];
            next[i] = { ...next[i], nodeTitle: e.target.value };
            emitChange(next);
          }}
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: '43%',
      render: (v, _, i) => (
        <TextArea
          rows={2}
          value={v || ''}
          placeholder="What to do, context, and done criteria"
          onChange={(e) => {
            const next = [...rows];
            next[i] = { ...next[i], description: e.target.value };
            emitChange(next);
          }}
        />
      ),
    },
    {
      title: 'Column',
      dataIndex: 'parentId',
      width: '25%',
      render: (v, _, i) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select column"
          value={v || undefined}
          options={parents.map((p) => ({ value: p.id, label: p.title }))}
          onChange={(parentId) => {
            const next = [...rows];
            next[i] = { ...next[i], parentId };
            emitChange(next);
          }}
        />
      ),
    },
    {
      title: '',
      key: 'rm',
      width: 48,
      render: (_, __, i) => (
        <Button
          size="small"
          danger
          onClick={() => emitChange(rows.filter((_, j) => j !== i))}
        >
          Remove
        </Button>
      ),
    },
  ];

  return <Table dataSource={rows} columns={columns} rowKey={(_, i) => String(i)} pagination={false} size="small" />;
}

function DocsSavePreview({ proposal, onChange }) {
  const [content, setContent] = useState(proposal.doc.content);

  useEffect(() => {
    onChange({
      ...proposal,
      doc: { ...proposal.doc, content },
    });
  }, [content]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <strong>Before</strong>
        <TextArea rows={12} value={proposal.doc.previousContent || ''} readOnly />
      </div>
      <div>
        <strong>After</strong>
        <TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
    </div>
  );
}

function GitCommitPreview({ proposal, onChange }) {
  const draft = proposal.draft || proposal;
  const [message, setMessage] = useState(draft.message || '');
  const [body, setBody] = useState(draft.body || '');

  useEffect(() => {
    if (proposal.type === 'git.commitMessage') {
      onChange({ ...proposal, draft: { ...draft, message, body } });
    } else {
      onChange({
        ...proposal,
        draft: { ...proposal.draft, message, body },
      });
    }
  }, [message, body]);

  return (
    <div>
      <Input
        placeholder="Commit subject"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <TextArea rows={6} placeholder="Commit body" value={body} onChange={(e) => setBody(e.target.value)} />
      {draft.files?.length ? (
        <ul style={{ marginTop: 8, fontSize: 12 }}>
          {draft.files.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function previewTitle(type) {
  const map = {
    'nodes.batchCreate': 'Create nodes',
    'nodes.update': 'Update nodes',
    'docs.save': 'Save document',
    'parents.create': 'Create columns',
    'git.commitMessage': 'Commit message',
    'git.stageAndCommit': 'Stage and commit',
    'diagrams.save': 'Save diagram',
  };
  return map[type] || 'Review changes';
}

export default function PluginActionPreviewHost() {
  const [preview, setPreview] = useState(getActivePreview());
  const [localProposal, setLocalProposal] = useState(preview?.proposal);

  useEffect(() => subscribePreview(setPreview), []);
  useEffect(() => {
    setLocalProposal(preview?.proposal);
  }, [preview]);

  if (!preview || !localProposal) return null;

  const handleApprove = async () => {
    await preview.handlers.onApprove(localProposal);
    clearActionPreview();
  };

  const handleCancel = () => {
    preview.handlers.onCancel();
    clearActionPreview();
  };

  let body = <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(localProposal, null, 2)}</pre>;
  if (localProposal.type === 'nodes.batchCreate') {
    body = <NodesBatchPreview proposal={localProposal} onChange={setLocalProposal} />;
  } else if (localProposal.type === 'docs.save') {
    body = <DocsSavePreview proposal={localProposal} onChange={setLocalProposal} />;
  } else if (
    localProposal.type === 'git.commitMessage' ||
    localProposal.type === 'git.stageAndCommit'
  ) {
    body = <GitCommitPreview proposal={localProposal} onChange={setLocalProposal} />;
  }

  return (
    <Modal
      open
      title={previewTitle(localProposal.type)}
      width={720}
      zIndex={2000}
      getContainer={() => document.body}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="apply" type="primary" onClick={handleApprove}>
          Apply
        </Button>,
      ]}
    >
      {body}
    </Modal>
  );
}
