import NodeController from '../../../api/nodes/NodeController';
import ParentController from '../../../api/parent/ParentController';
import DocsController from '../../../api/docs/DocsController';
import DiagramsController from '../../../api/diagrams/DiagramsController';
import GitController from '../../../api/git/GitController';
import TagController from '../../../api/tag/TagController';
import MetadataController from '../../../api/metadata/MetadataController';

/** @param {import('banflow-plugin-api').ActionProposal} proposal */
export async function applyProposal(proposal) {
  switch (proposal.type) {
    case 'nodes.batchCreate':
      for (const n of proposal.nodes) {
        const created = await NodeController.createNode(
          'task',
          n.nodeTitle,
          n.parentId || '',
          n.iterationId || '',
        );
        const description = (n.description || '').trim();
        if (description && created?.id) {
          await NodeController.updateNodeProperty(
            'description',
            created.id,
            description,
          );
        }
      }
      break;
    case 'nodes.update':
      for (const u of proposal.updates) {
        await NodeController.updateNodeProperty(u.property, u.nodeId, u.value);
      }
      break;
    case 'nodes.delete':
      for (const { nodeId, parentId } of proposal.nodeIds) {
        await NodeController.deleteNode(nodeId, parentId || '');
      }
      break;
    case 'parents.create':
      for (const p of proposal.parents) {
        await ParentController.createParent(p.parentTitle, p.trelloData);
      }
      break;
    case 'parents.update':
      for (const u of proposal.updates) {
        await ParentController.updateParentProperty(u.property, u.parentId, u.value);
      }
      break;
    case 'parents.delete':
      for (const id of proposal.parentIds) {
        await ParentController.deleteParent(id);
      }
      break;
    case 'docs.save':
      await DocsController.save(
        proposal.doc.path,
        proposal.doc.content,
        proposal.doc.isGlobal ?? false,
      );
      break;
    case 'docs.delete':
      await DocsController.delete(proposal.path, proposal.isGlobal ?? false);
      break;
    case 'diagrams.save':
      await DiagramsController.save(
        proposal.diagram.path,
        proposal.diagram.content,
        proposal.diagram.isGlobal ?? false,
      );
      break;
    case 'diagrams.delete':
      await DiagramsController.delete(proposal.path, proposal.isGlobal ?? false);
      break;
    case 'git.stageAndCommit': {
      const { repoPath, message, files } = proposal.draft;
      if (files?.length) {
        await GitController.stageFiles(repoPath, files);
      }
      await GitController.commit(repoPath, message);
      break;
    }
    case 'git.commitMessage':
      break;
    case 'tags.add':
      await TagController.addTag(proposal.tag, proposal.color);
      break;
    case 'metadata.set':
      await MetadataController.saveMetadataValue(String(proposal.value), proposal.field);
      break;
    default:
      throw new Error(`Unknown proposal type: ${proposal.type}`);
  }
}
