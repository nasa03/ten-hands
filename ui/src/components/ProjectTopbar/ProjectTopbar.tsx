import {
    Alert,
    Alignment,
    Button,
    Dialog,
    Icon,
    Menu,
    MenuDivider,
    MenuItem,
    Navbar,
    Popover,
    Tooltip,
} from "@blueprintjs/core";
import React from "react";
import styled from "styled-components";
import { isRunningInElectron, openInExplorer } from "../../utils/electron";
import NewCommandDrawer from "../NewCommandDrawer";
import { useProjects } from "../shared/Projects";
import { useTheme } from "../shared/Themes";
import CommandOrderListContainer from "./CommandOrderListContainer";

// Have to use require because it's type-definition doesn't have function that allows path
// Do not want to update node_module's file.
// tslint:disable-next-line: no-var-requires
const getRepoInfo = require("git-repo-info");

interface IProjectTopbarProps {
    activeProject: IProject;
}

const GitBranchContainer = styled.div`
    display: flex;
    align-items: center;
    & > .git-branch-name {
        padding-left: 5px;
    }
`;

const ProjectTopbar: React.FC<IProjectTopbarProps> = React.memo(({ activeProject }) => {
    const [isDeleteAlertOpen, setDeleteAlertOpen] = React.useState(false);
    const [commandsOrderModalOpen, setCommandsOrderModalOpen] = React.useState<boolean>(false);
    const { theme } = useTheme();
    const [isDrawerOpen, setDrawerOpen] = React.useState(false);

    const { deleteProject } = useProjects();

    const shouldDeleteProject = async shouldDelete => {
        try {
            if (shouldDelete) {
                deleteProject(activeProject._id!);
                setDeleteAlertOpen(false);
            }
        } catch (error) {
            console.error(`Error deleting project: `, error);
        }
    };

    const handleChangeOrderModalClose = () => {
        setCommandsOrderModalOpen(false);
    };

    const getGitBranch = React.useCallback(() => {
        if (isRunningInElectron()) {
            const projectPath = activeProject.path;
            const gitInfo = getRepoInfo(projectPath);
            return gitInfo.branch || "";
        } else {
            return "";
        }
    }, [activeProject]);

    return (
        <>
            <Navbar>
                <Navbar.Group>
                    <Navbar.Heading data-testid="active-project-name">{activeProject.name}</Navbar.Heading>
                    {isRunningInElectron() ? (
                        <Tooltip content="Open project in file explorer">
                            <Button
                                data-testid="open-project-directory-button"
                                icon="folder-shared-open"
                                minimal={true}
                                onClick={() => openInExplorer(activeProject.path)}
                            />
                        </Tooltip>
                    ) : null}
                    <Navbar.Heading data-testid="active-project-git-branch">
                        {getGitBranch() ? (
                            <GitBranchContainer>
                                <Navbar.Divider style={{ paddingRight: 10 }} /> <Icon icon="git-branch" />
                                {<span className="git-branch-name">{getGitBranch()}</span>}
                            </GitBranchContainer>
                        ) : null}
                    </Navbar.Heading>
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    <Button
                        onClick={() => setDrawerOpen(true)}
                        icon="add"
                        intent="success"
                        text="New Task"
                        minimal={true}
                        data-testid="new-task-button"
                    />
                    <Navbar.Divider />
                    <Popover position="left-top">
                        <Button icon="cog" minimal={true} data-testid="project-settings-button" />
                        <Menu key="menu">
                            <MenuDivider title="Layout" />
                            <MenuItem
                                data-testid="change-tasks-order-menu-item"
                                icon="sort"
                                text="Change Tasks order"
                                onClick={() => setCommandsOrderModalOpen(true)}
                            />
                            <MenuDivider title="Danger" />
                            <MenuItem
                                data-testid="delete-project-menu-item"
                                icon="trash"
                                text="Delete Project"
                                intent="danger"
                                onClick={() => setDeleteAlertOpen(true)}
                            />
                        </Menu>
                    </Popover>
                    <Dialog
                        title="Change Tasks Order"
                        icon={"numbered-list"}
                        className={theme}
                        isOpen={commandsOrderModalOpen}
                        onClose={handleChangeOrderModalClose}
                    >
                        <CommandOrderListContainer activeProject={activeProject} />
                    </Dialog>
                </Navbar.Group>
            </Navbar>
            <Alert
                cancelButtonText="Cancel"
                confirmButtonText="Yes, Delete"
                className={theme}
                icon="trash"
                intent="danger"
                isOpen={isDeleteAlertOpen}
                onCancel={() => setDeleteAlertOpen(false)}
                onConfirm={() => shouldDeleteProject(true)}
            >
                <p data-testid="delete-project-warning">
                    Are you sure you want to delete project <b>{activeProject.name}</b>?
                </p>
            </Alert>
            <NewCommandDrawer isDrawerOpen={isDrawerOpen} setDrawerOpen={setDrawerOpen} />
        </>
    );
});

export default ProjectTopbar;
