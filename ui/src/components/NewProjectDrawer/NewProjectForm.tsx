import { Button, Code, FileInput, FormGroup, HTMLSelect, InputGroup, Pre } from "@blueprintjs/core";
import { Formik } from "formik";
import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { isRunningInElectron } from "../../utils/electron";
import { hasProjectWithSameName } from "../../utils/projects";
import { useProjects } from "../shared/Projects";
import handleConfigFiles from "./handleConfigFiles";
import NewProjectCommands from "./NewProjectCommands";
import ProjectFileUpload from "./ProjectFileUpload";

const initialProject: IProject = {
    name: "",
    type: "",
    commands: [],
    configFile: "",
    path: "",
};

const Container = styled.div`
    height: 100%;
    overflow: auto;
`;

interface INewProjectFormProps {
    setDrawerOpen: (isOpen: boolean) => any;
}

const NewProjectForm: React.FC<INewProjectFormProps> = React.memo(({ setDrawerOpen }) => {
    const [configFileName, setConfigFileName] = useState("");
    const { projects, addProject } = useProjects();

    const fillFormWithProjectConfig = (file: ITenHandsFile, setFieldValue) => {
        const parsedProjectData = handleConfigFiles(file);
        if (parsedProjectData !== null) {
            const { name: projectName, type, commands, configFile, path } = parsedProjectData;
            // Manually set each field after parsing the file
            setFieldValue("configFile", configFile);
            setFieldValue("name", projectName);
            setFieldValue("type", type);
            setFieldValue("commands", commands);
            setFieldValue("path", path);
        } else {
            // If file not recognized, then fill empty values
            setFieldValue("configFile", file.name);
            setFieldValue("name", "");
            setFieldValue("type", "");
            setFieldValue("commands", "");
            setFieldValue("path", "");
        }
    };
    const onConfigFileUpload = useCallback((filePath, fileData, setFieldValue) => {
        try {
            if (isRunningInElectron()) {
                const path = require("path");
                const fileName = path.basename(filePath);
                const projectPath = path.dirname(filePath);
                const tenHandsFile: ITenHandsFile = {
                    name: fileName,
                    path: projectPath,
                    data: fileData,
                };
                setConfigFileName(fileName);
                fillFormWithProjectConfig(tenHandsFile, setFieldValue);
            }
        } catch (error) {
            console.log("error:", error);
        }
    }, []);

    const onProjectFileChange = useCallback((e, setFieldValue) => {
        e.preventDefault();

        const reader = new FileReader();
        const file = e.target.files[0];

        reader.onloadend = () => {
            console.log("file:", file);
            const { name } = file;
            setConfigFileName(name);
            const readerResult = reader.result;
            const tenHandsFile: ITenHandsFile = {
                name,
                data: readerResult,
            };

            fillFormWithProjectConfig(tenHandsFile, setFieldValue);
        };

        try {
            reader.readAsText(file);
        } catch (error) {
            // Happens when a file selected once and opens file dialog again and cancel without selecting any file.
            console.warn(`Error reading file. Did you select any file ?.`);
        }
    }, []);

    // const { fileName, values, handleChange, onProjectFileChange } = props;
    const handleSubmit = async (values, actions) => {
        // console.info("values:", values);
        try {
            actions.setSubmitting(true);
            if (hasProjectWithSameName(projects, values.name)) {
                const answer = window.confirm(
                    "Project with same name already exists. Do you want to add project anyway?",
                );
                if (answer) {
                    actions.setSubmitting(true);
                    await addProject(values);
                    actions.setSubmitting(false);
                    setDrawerOpen(false);
                } else {
                    console.log("Cancelled by user");
                    actions.setSubmitting(false);
                }
            } else {
                actions.setSubmitting(true);
                await addProject(values);
                actions.setSubmitting(false);
                setDrawerOpen(false);
            }
        } catch (error) {
            console.error(error);
            actions.setSubmitting(false);
        }
    };

    return (
        <Container>
            <Formik
                initialValues={initialProject}
                onSubmit={handleSubmit}
                render={props => (
                    <form data-testid="new-project-form" onSubmit={props.handleSubmit}>
                        <FormGroup
                            label="Project Config File"
                            helperText="Currently supports only package.json. You can create a project without this."
                        >
                            {isRunningInElectron() ? (
                                <ProjectFileUpload
                                    configFileName={configFileName}
                                    onConfigFileUpload={(fileName, fileData) =>
                                        onConfigFileUpload(fileName, fileData, props.setFieldValue)
                                    }
                                />
                            ) : (
                                <FileInput
                                    text={configFileName || "Choose file..."}
                                    inputProps={{
                                        id: "configFile",
                                    }}
                                    fill={true}
                                    onInputChange={e => onProjectFileChange(e, props.setFieldValue)}
                                />
                            )}
                        </FormGroup>
                        <FormGroup
                            label="Project Name"
                            labelFor="name"
                            helperText="Will be auto-filled if you are using a package.json. Otherwise, choose a name."
                        >
                            <InputGroup
                                id="name"
                                type="text"
                                placeholder="My Awesome Project"
                                onChange={props.handleChange}
                                value={props.values.name}
                            />
                        </FormGroup>
                        <FormGroup
                            label="Project Path"
                            labelFor="path"
                            helperText={
                                isRunningInElectron() ? (
                                    "Absolute path to the project directory. Will be auto-filled if a package.json uploaded."
                                ) : (
                                    <span>
                                        Absolute path to the project directory. Will be auto-filled if{" "}
                                        <i>tenHands.path</i> exists in package.json.
                                    </span>
                                )
                            }
                        >
                            <InputGroup
                                required={true}
                                id="path"
                                type="text"
                                placeholder={
                                    navigator.platform.toLowerCase() === "win32"
                                        ? "D:\\AllProjects\\MyProjectDirectory"
                                        : "/home/all-projects/my-project"
                                }
                                onChange={props.handleChange}
                                value={props.values.path}
                            />
                        </FormGroup>
                        {/* <FormGroup
                            label="Project Type"
                            labelFor="type"
                            helperText="Will be auto-filled if it can be determined from package.json."
                        >
                            <HTMLSelect fill={true} id="type" onChange={props.handleChange} value={props.values.type}>
                                <option value="">Select Project Type</option>
                                <option value="nodejs">NodeJS</option>
                                <option value="other">Other</option>
                            </HTMLSelect>
                        </FormGroup> */}
                        <FormGroup
                            label="Tasks"
                            labelFor="commands"
                            helperText="Will be auto-filled if available in package.json. Otherwise, you can add tasks after creating the project."
                        >
                            <NewProjectCommands
                                commands={props.values.commands}
                                setCommands={(commands: IProjectCommand[]) => props.setFieldValue("commands", commands)}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Button
                                data-testid="save-project-button"
                                intent="primary"
                                text="Save Project"
                                type="submit"
                                loading={props.isSubmitting}
                                large={true}
                            />
                        </FormGroup>
                    </form>
                )}
            />
        </Container>
    );
});

export default NewProjectForm;
